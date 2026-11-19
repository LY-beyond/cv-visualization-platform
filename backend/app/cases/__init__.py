"""交互案例子系统：案例契约、注册表与内置案例清单。"""

from app.cases import builtin  # noqa: F401  触发内置案例注册
from app.cases.registry import case_registry

__all__ = ["case_registry"]
