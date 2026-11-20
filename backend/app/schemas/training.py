"""训练任务、过程事件与评估结果结构。"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

TaskState = Literal["created", "queued", "running", "succeeded", "failed", "cancelled"]


class TrainRequest(BaseModel):
    model_id: str
    dataset_id: str
    hyperparams: Dict[str, Any] = Field(default_factory=dict)


class TrainTaskInfo(BaseModel):
    id: str
    model_id: str
    dataset_id: str
    hyperparams: Dict[str, Any] = Field(default_factory=dict)
    state: TaskState = "created"
    progress: float = 0.0
    current_epoch: int = 0
    total_epochs: int = 0
    created_at: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    error: Optional[str] = None
    result_url: Optional[str] = None


class MetricPoint(BaseModel):
    epoch: int
    loss: Optional[float] = None
    accuracy: Optional[float] = None
    val_loss: Optional[float] = None
    val_accuracy: Optional[float] = None


class TrainEvent(BaseModel):
    """SSE 事件体：日志、指标、状态与完成通知。"""

    task_id: str
    event: Literal["log", "metric", "state", "done", "error"]
    message: str = ""
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str


class ErrorSample(BaseModel):
    dataset_id: str
    index: int
    true_label: str
    predicted_label: str
    url: Optional[str] = None


class EvaluationResult(BaseModel):
    task_id: str
    accuracy: Optional[float] = None
    top5_accuracy: Optional[float] = None
    confusion_matrix: List[List[int]] = Field(default_factory=list)
    class_names: List[str] = Field(default_factory=list)
    error_samples: List[ErrorSample] = Field(default_factory=list)
    embedding: List[Dict[str, Any]] = Field(default_factory=list)


class ComparisonItem(BaseModel):
    """同一数据集上各模型的最近一次评估，用于横向对比。"""

    task_id: str
    model_id: str
    model_name: str
    params: str = ""
    accuracy: Optional[float] = None
    top5_accuracy: Optional[float] = None
    confusion_matrix: List[List[int]] = Field(default_factory=list)
    class_names: List[str] = Field(default_factory=list)
    finished_at: Optional[str] = None
