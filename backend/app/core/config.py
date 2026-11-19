"""集中配置：路径、跨域、训练上限等，避免散落硬编码。"""

from pathlib import Path
from typing import List

# backend/ 目录
BASE_DIR = Path(__file__).resolve().parents[2]

APP_NAME = "计算机视觉交互式教学可视化平台"
APP_VERSION = "0.1.0"
API_PREFIX = "/api"

# 存储目录：内置样本、预训练权重/历史、结果缓存、静态素材
STORAGE_DIR = BASE_DIR / "storage"
DATASETS_DIR = STORAGE_DIR / "datasets"
ASSETS_DIR = STORAGE_DIR / "assets"
RESULTS_DIR = STORAGE_DIR / "results"
PRETRAIN_DIR = BASE_DIR / "pretrain"

# 允许的前端开发地址
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 现场训练保护上限（普通 CPU 主机）
TRAIN_MAX_EPOCHS = 20
TRAIN_TIMEOUT_SECONDS = 300
TRAIN_MAX_SAMPLES = 5000

# 上传图片限制
UPLOAD_MAX_MB = 10
