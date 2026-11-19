"""素材接口：列出内置示例图片与结构图。静态文件通过 /assets 挂载。"""

from pathlib import Path
from typing import List

from fastapi import APIRouter

from app.core.config import ASSETS_DIR
from app.core.response import ApiResponse, ok

router = APIRouter(prefix="/assets", tags=["素材"])


@router.get("", response_model=ApiResponse[List[str]])
def list_assets():
    if not ASSETS_DIR.exists():
        return ok([])
    files = [
        str(path.relative_to(ASSETS_DIR)).replace("\\", "/")
        for path in sorted(ASSETS_DIR.rglob("*"))
        if path.is_file()
    ]
    return ok(files)
