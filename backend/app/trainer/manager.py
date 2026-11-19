"""训练任务管理：生命周期状态、后台线程执行与事件推送。"""

import json
import queue
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.config import TRAIN_MAX_EPOCHS
from app.core.paths import result_dir
from app.datasets.registry import dataset_registry
from app.models.registry import model_registry
from app.schemas.training import EvaluationResult, MetricPoint, TaskState, TrainEvent, TrainTaskInfo
from app.trainer.history import save_history


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


@dataclass
class TrainTask:
    id: str
    model_id: str
    dataset_id: str
    hyperparams: Dict[str, Any]
    state: TaskState = "created"
    progress: float = 0.0
    current_epoch: int = 0
    total_epochs: int = 0
    created_at: str = field(default_factory=_now)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    error: Optional[str] = None
    metrics: List[Dict[str, Any]] = field(default_factory=list)
    logs: List[str] = field(default_factory=list)
    evaluation: Optional[Dict[str, Any]] = None

    def to_info(self) -> TrainTaskInfo:
        return TrainTaskInfo(
            id=self.id,
            model_id=self.model_id,
            dataset_id=self.dataset_id,
            hyperparams=self.hyperparams,
            state=self.state,
            progress=self.progress,
            current_epoch=self.current_epoch,
            total_epochs=self.total_epochs,
            created_at=self.created_at,
            started_at=self.started_at,
            finished_at=self.finished_at,
            error=self.error,
            result_url=f"/api/training/tasks/{self.id}/evaluation" if self.evaluation else None,
        )


class TaskManager:
    def __init__(self) -> None:
        self._tasks: Dict[str, TrainTask] = {}
        self._subscribers: Dict[str, List["queue.Queue"]] = {}
        self._lock = threading.Lock()

    def list_tasks(self) -> List[TrainTaskInfo]:
        return [task.to_info() for task in self._tasks.values()]

    def get(self, task_id: str) -> TrainTask:
        from app.core.exceptions import NotFoundError

        task = self._tasks.get(task_id)
        if task is None:
            raise NotFoundError(f"训练任务不存在: {task_id}")
        return task

    def create(self, model_id: str, dataset_id: str, hyperparams: Dict[str, Any]) -> TrainTask:
        handler = model_registry.get(model_id)
        dataset_registry.get(dataset_id)
        if not handler.meta.implemented:
            from app.core.exceptions import NotImplementedFeatureError

            raise NotImplementedFeatureError(f"模型「{handler.meta.name}」尚未接入训练实现")

        task = TrainTask(
            id=f"task_{uuid.uuid4().hex[:10]}",
            model_id=model_id,
            dataset_id=dataset_id,
            hyperparams=dict(hyperparams),
            state="queued",
        )
        with self._lock:
            self._tasks[task.id] = task

        thread = threading.Thread(target=self._run, args=(task,), daemon=True)
        thread.start()
        return task

    def subscribe(self, task_id: str) -> "queue.Queue[Dict[str, Any]]":
        channel: "queue.Queue[Dict[str, Any]]" = queue.Queue()
        self._subscribers.setdefault(task_id, []).append(channel)
        return channel

    def unsubscribe(self, task_id: str, channel: "queue.Queue[Dict[str, Any]]") -> None:
        channels = self._subscribers.get(task_id, [])
        if channel in channels:
            channels.remove(channel)

    def _emit(self, task: TrainTask, event: str, message: str = "", payload: Optional[dict] = None) -> None:
        payload = payload or {}
        record = TrainEvent(
            task_id=task.id,
            event=event,  # type: ignore[arg-type]
            message=message,
            payload=payload,
            timestamp=_now(),
        ).model_dump()
        for channel in list(self._subscribers.get(task.id, [])):
            channel.put(record)

    def _run(self, task: TrainTask) -> None:
        handler = model_registry.get(task.model_id)
        dataset = dataset_registry.get(task.dataset_id)
        task.state = "running"
        task.started_at = _now()
        task.total_epochs = int(task.hyperparams.get("epochs", min(5, TRAIN_MAX_EPOCHS)))
        self._emit(task, "state", "训练开始", {"state": task.state})

        def on_metric(point: MetricPoint) -> None:
            task.current_epoch = point.epoch
            task.progress = round(point.epoch / max(task.total_epochs, 1), 3)
            task.metrics.append(point.model_dump())
            self._emit(task, "metric", "指标更新", point.model_dump())

        try:
            handler.train(dataset, task.hyperparams, on_metric)
            task.state = "succeeded"
            task.progress = 1.0
            self._emit(task, "state", "训练完成", {"state": task.state})
        except NotImplementedError as exc:
            task.state = "failed"
            task.error = str(exc)
            task.logs.append(task.error)
            self._emit(task, "error", task.error)
        except Exception as exc:  # noqa: BLE001 保留日志并标记失败
            task.state = "failed"
            task.error = f"训练失败: {exc}"
            task.logs.append(task.error)
            self._emit(task, "error", task.error)
        finally:
            task.finished_at = _now()
            if task.metrics:
                save_history(task.id, task.metrics, task.evaluation or {})
            self._emit(task, "done", "任务结束", {"state": task.state})
            self._persist(task)

    def evaluation_path(self, task_id: str):
        return result_dir(task_id) / "evaluation.json"

    def load_evaluation(self, task_id: str) -> EvaluationResult:
        task = self.get(task_id)
        if not task.evaluation:
            from app.core.exceptions import NotFoundError

            raise NotFoundError("该任务尚无评估结果")
        return EvaluationResult(**task.evaluation)

    def _persist(self, task: TrainTask) -> None:
        payload = {
            "task": task.to_info().model_dump(),
            "metrics": task.metrics,
            "logs": task.logs,
            "evaluation": task.evaluation,
        }
        (result_dir(task.id) / "task.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )


task_manager = TaskManager()
