"""模型子系统：统一契约、注册表与内置模型元信息。"""

from app.models import builtin  # noqa: F401  触发内置模型注册
from app.models.registry import model_registry

__all__ = ["model_registry"]
