"""统一响应信封：状态标识 + 数据体 + 提示信息。"""

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 0
    message: str = "ok"
    data: Optional[T] = None


class PageData(BaseModel, Generic[T]):
    total: int = 0
    items: List[T] = []


def ok(data: Optional[T] = None, message: str = "ok") -> ApiResponse[T]:
    return ApiResponse[T](code=0, message=message, data=data)


def fail(code: int, message: str, data: Optional[T] = None) -> ApiResponse[T]:
    return ApiResponse[T](code=code, message=message, data=data)
