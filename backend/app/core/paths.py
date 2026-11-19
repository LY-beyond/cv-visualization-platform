"""统一路径工具，避免在业务代码中硬编码分隔符。"""

from pathlib import Path

from app.core.config import ASSETS_DIR, DATASETS_DIR, PRETRAIN_DIR, RESULTS_DIR, STORAGE_DIR


def ensure_directories() -> None:
    """启动时确保运行期目录存在。"""
    for directory in (STORAGE_DIR, DATASETS_DIR, ASSETS_DIR, RESULTS_DIR, PRETRAIN_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def dataset_dir(dataset_id: str) -> Path:
    return DATASETS_DIR / dataset_id


def dataset_manifest(dataset_id: str) -> Path:
    return dataset_dir(dataset_id) / "manifest.json"


def result_dir(task_id: str) -> Path:
    path = RESULTS_DIR / task_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def pretrain_dir(model_id: str) -> Path:
    return PRETRAIN_DIR / model_id


def resolve_storage_path(relative_path: str) -> Path:
    """把注册表中的相对资源路径解析为绝对路径，并阻止越界访问。"""
    candidate = (STORAGE_DIR / relative_path).resolve()
    if not str(candidate).startswith(str(STORAGE_DIR.resolve())):
        raise ValueError(f"非法的资源路径: {relative_path}")
    return candidate
