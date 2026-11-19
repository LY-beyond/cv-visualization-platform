"""训练接口：创建任务、状态查询、SSE 过程推送与评估结果。"""

import json
from typing import List

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.response import ApiResponse, ok
from app.schemas.training import EvaluationResult, TrainRequest, TrainTaskInfo
from app.trainer.manager import task_manager

router = APIRouter(prefix="/training", tags=["训练"])


@router.post("/tasks", response_model=ApiResponse[TrainTaskInfo])
def create_task(payload: TrainRequest):
    task = task_manager.create(payload.model_id, payload.dataset_id, payload.hyperparams)
    return ok(task.to_info(), message="训练任务已创建")


@router.get("/tasks", response_model=ApiResponse[List[TrainTaskInfo]])
def list_tasks():
    return ok(task_manager.list_tasks())


@router.get("/tasks/{task_id}", response_model=ApiResponse[TrainTaskInfo])
def get_task(task_id: str):
    return ok(task_manager.get(task_id).to_info())


@router.get("/tasks/{task_id}/evaluation", response_model=ApiResponse[EvaluationResult])
def get_evaluation(task_id: str):
    return ok(task_manager.load_evaluation(task_id))


@router.get("/tasks/{task_id}/events")
def stream_events(task_id: str):
    task_manager.get(task_id)
    channel = task_manager.subscribe(task_id)

    def event_stream():
        try:
            yield f"event: state\ndata: {json.dumps({'task_id': task_id, 'state': task_manager.get(task_id).state}, ensure_ascii=False)}\n\n"
            while True:
                try:
                    event = channel.get(timeout=15)
                except Exception:
                    yield ": heartbeat\n\n"
                    task = task_manager.get(task_id)
                    if task.state in ("succeeded", "failed", "cancelled"):
                        break
                    continue
                yield f"event: {event['event']}\ndata: {json.dumps(event, ensure_ascii=False)}\n\n"
                if event["event"] in ("done", "error"):
                    break
        finally:
            task_manager.unsubscribe(task_id, channel)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
