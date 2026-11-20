"""训练接口：创建任务、状态查询、SSE 过程推送与评估结果。"""

import json
from typing import Any, Dict, List

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.response import ApiResponse, ok
from app.models.registry import model_registry
from app.schemas.training import ComparisonItem, EvaluationResult, TrainRequest, TrainTaskInfo
from app.trainer.manager import task_manager

router = APIRouter(prefix="/training", tags=["训练"])

_TERMINAL_STATES = ("succeeded", "failed", "cancelled")


def _sse(event: str, payload: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/tasks", response_model=ApiResponse[TrainTaskInfo])
def create_task(payload: TrainRequest):
    task = task_manager.create(payload.model_id, payload.dataset_id, payload.hyperparams)
    return ok(task.to_info(), message="训练任务已创建")


@router.get("/comparison", response_model=ApiResponse[List[ComparisonItem]])
def compare_models(dataset_id: str):
    """返回指定数据集上各已实现模型的最近一次评估，按准确率降序。"""
    items: List[ComparisonItem] = []
    for task in task_manager.latest_evaluations(dataset_id):
        evaluation = task.evaluation or {}
        try:
            meta = model_registry.get(task.model_id).meta
        except Exception:  # noqa: BLE001 模型下线后仍保留历史对比
            meta = None
        items.append(
            ComparisonItem(
                task_id=task.id,
                model_id=task.model_id,
                model_name=meta.name if meta else task.model_id,
                params=meta.params if meta else "",
                accuracy=evaluation.get("accuracy"),
                top5_accuracy=evaluation.get("top5_accuracy"),
                confusion_matrix=evaluation.get("confusion_matrix") or [],
                class_names=evaluation.get("class_names") or [],
                finished_at=task.finished_at,
            )
        )
    return ok(items)


@router.get("/tasks", response_model=ApiResponse[List[TrainTaskInfo]])
def list_tasks():
    return ok(task_manager.list_tasks())


@router.get("/tasks/{task_id}", response_model=ApiResponse[TrainTaskInfo])
def get_task(task_id: str):
    return ok(task_manager.get(task_id).to_info())


@router.get("/tasks/{task_id}/evaluation", response_model=ApiResponse[EvaluationResult])
def get_evaluation(task_id: str):
    return ok(task_manager.load_evaluation(task_id))


@router.get("/tasks/{task_id}/history", response_model=ApiResponse[Dict[str, Any]])
def get_history(task_id: str):
    payload = task_manager.load_history(task_id)
    if not payload:
        task = task_manager.get(task_id)
        payload = {
            "task_id": task.id,
            "metrics": task.metrics,
            "evaluation": task.evaluation,
        }
    return ok(payload)


@router.get("/tasks/{task_id}/events")
def stream_events(task_id: str):
    task_manager.get(task_id)
    channel = task_manager.subscribe(task_id)

    def event_stream():
        try:
            current = task_manager.get(task_id)
            yield _sse(
                "state",
                {
                    "task_id": task_id,
                    "state": current.state,
                    "progress": current.progress,
                    "current_epoch": current.current_epoch,
                    "total_epochs": current.total_epochs,
                },
            )
            if current.state in _TERMINAL_STATES:
                yield _sse("done", {"task_id": task_id, "state": current.state})
                return

            while True:
                try:
                    event = channel.get(timeout=15)
                except Exception:
                    yield ": heartbeat\n\n"
                    if task_manager.get(task_id).state in _TERMINAL_STATES:
                        break
                    continue
                yield _sse(event["event"], event)
                if event["event"] in ("done", "error"):
                    break
        finally:
            task_manager.unsubscribe(task_id, channel)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
