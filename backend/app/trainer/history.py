"""训练历史持久化：逐轮指标与评估结果按任务归档。"""

import json
from typing import Any, Dict, List

from app.core.paths import result_dir


def save_history(task_id: str, metrics: List[Dict[str, Any]], evaluation: Dict[str, Any]) -> None:
    directory = result_dir(task_id)
    payload = {"task_id": task_id, "metrics": metrics, "evaluation": evaluation}
    (directory / "history.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if evaluation:
        (directory / "evaluation.json").write_text(
            json.dumps(evaluation, ensure_ascii=False, indent=2), encoding="utf-8"
        )


def load_history(task_id: str) -> Dict[str, Any]:
    path = result_dir(task_id) / "history.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))
