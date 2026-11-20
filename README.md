# cv-visualization-platform

《计算机视觉》课程大作业：知识点讲解 + 可交互案例 + 模型训练与对比的交互式教学可视化平台。

前后端分离：**FastAPI 后端 + React + Vite + TypeScript 前端**。章节内容与课程课件一一对应，数据集、模型、案例均通过注册表接入，新增内容不改动既有框架。

## 目录结构

```text
cv-visualization-platform/
├── 课件/                          # 课程课件 PDF（只读素材来源）
├── 计算机视觉可视化平台开发指南.docx
├── backend/
│   ├── app/
│   │   ├── api/                   # 数据集、模型、训练、推理、案例、素材路由
│   │   ├── core/                  # 配置、路径、统一响应、异常、日志
│   │   ├── datasets/              # 数据集契约、注册表、内置小样本登记
│   │   ├── models/                # 模型契约、注册表、内置模型元信息
│   │   ├── trainer/               # 训练任务编排、SSE 事件、指标与历史
│   │   ├── cases/                 # 交互案例契约、注册表、内置案例清单
│   │   ├── schemas/               # 请求/响应数据结构
│   │   └── main.py                # FastAPI 应用入口
│   ├── pretrain/                  # 预训练权重与训练历史（按模型分目录）
│   ├── storage/
│   │   ├── datasets/              # 内置样本 + manifest.json
│   │   ├── assets/                # 示例图片、结构图（/assets 静态访问）
│   │   └── results/               # 训练与案例结果缓存
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── chapters/              # 章节配置：导航、路由与讲解要点
    │   ├── components/            # 布局、章节页、知识卡、模型卡、参数面板等
    │   ├── viz/                   # 训练曲线、混淆矩阵、特征嵌入投影
    │   ├── cases/                 # 前端案例注册表与案例工作台
    │   ├── stores/                # 数据集、模型、任务、界面偏好状态
    │   ├── api/                   # 接口封装与类型定义
    │   ├── assets/                # 前端静态素材
    │   ├── App.tsx                # 路由
    │   └── main.tsx
    ├── index.html
    ├── tailwind.config.js
    └── package.json
```

## 章节覆盖

| 章节标识 | 课件章节 | 状态 |
| --- | --- | --- |
| `ch1` | 第1章 计算机视觉概述 | 已实现（讲解 + 前端案例） |
| `ch2` | 第2章 基础知识 | 已实现（讲解 + 后端案例） |
| `ch2-stitch` | 第2章实例 特征点匹配与图像拼接 | 已实现（讲解 + 后端案例） |
| `ch3` | 第3章 图像分类 | 已实现（讲解 + 训练 + 分析案例） |
| `ch4` | 第4章 图像语义分割 | 已实现（讲解 + 分割案例） |
| `ch5` | 第5章 目标检测 | 已实现（讲解 + 检测案例） |
| `ch6` | 第6章 识别 | 已实现（讲解 + 识别案例） |
| `ch7` | 第7章 目标跟踪 | 已实现（讲解 + 卡尔曼跟踪案例） |
| `ch8` | 第8章 多目视觉 | 已实现（讲解 + 双目深度案例） |
| `ch9` | 第9章 视觉问答 | 已实现（讲解 + 图文对齐案例） |

后端已登记 6 个内置小样本数据集、12 个模型、53 个交互案例；页面包含知识点讲解、KaTeX 核心公式、方法对比表、课件结构图与交互实验。学习路径（`/path`）把案例组织成带前置关系的关卡，知识图谱（`/graph`）可视化章节、关卡、案例与上机实验的连接，右下角离线助教可解释参数与诊断结果。**上机实验中心**（`/labs`）收录五次实验的完整档案：真实数据图表、结果图、预计算检测结果与思考题，并与章节案例双向跳转。支持浅色/深色主题，全部资源本地化，可断网演示。

## 本地启动

### 后端

```powershell
cd backend
# 已创建 Python 3.10 虚拟环境 backend/.venv
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

- 接口文档：http://127.0.0.1:8000/docs
- 健康检查：http://127.0.0.1:8000/api/health

### 前端

```powershell
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173 ，开发服务器已将 `/api`、`/assets` 代理到后端 8000 端口。

### 单进程部署（离线演示）

```powershell
cd frontend
npm run build          # 产物使用 /app 作为基础路径
cd ..\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

打开 http://127.0.0.1:8000/app/ 即可，无需额外静态服务器。详细步骤见 [部署说明](docs/部署说明.md)。

## 测试

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

覆盖案例契约、注册一致性、离线素材、NumPy 算子与外部依赖检查。答辩演示脚本与架构说明见 [答辩材料](docs/答辩材料.md)。

## 浏览器推理与模型放置

第 4/5 章的“浏览器端语义分割 / 目标检测（ONNX）”使用 `onnxruntime-web` 在本地推理，模型文件放在 `frontend/public/models/`：

```text
frontend/public/models/
├── manifest.json              # 任务 → 模型目录与文件映射
├── detection/{config.json, labels.json, model.onnx}
├── segmentation/{config.json, labels.json, model.onnx}
├── lenet-mnist/               # 实验三教师模型：weights.bin + config.json（纯 JS 前向）
└── ort/                       # onnxruntime-web 的本地 wasm 运行时
```

模型缺失或加载失败时会自动回退到后端内置示例结果，不影响离线演示。`config.json` 与前端 `inference/modelConfig.ts` 字段一致（输入尺寸、通道顺序、均值/标准差、缩放方式、类别标签、分数阈值）。

LeNet 手写数字案例不依赖 wasm：`scripts/convert_lenet_onnx.py` 读取实验三的 `LeNet-teacher.keras`，复制权重导出 ONNX（用于校验），同时生成按层拼接的 `weights.bin`，前端在 `inference/lenet.ts` 中完成卷积、池化与全连接的纯 JS 前向。

上机实验素材位于 `frontend/public/labs/lab1~lab5/`（图片、预计算 JSON），由 `scripts/migrate_lab_assets.py` 从 `实验项目/` 迁移并压缩；大型检测权重保留在原目录，网站只登记元信息与预计算结果。

## 内置样本组织

每个数据集对应 `backend/storage/datasets/<数据集标识>/` 目录，`manifest.json` 记录划分、样本路径与标签：

```json
{
  "splits": {
    "train": [
      { "path": "images/0001.png", "label": 0 },
      { "path": "images/0002.png", "label": 1 }
    ],
    "test": []
  }
}
```

未放置样本时接口仍可正常返回数据集元信息，样本接口会给出明确的缺失提示。

## 扩展入口

- 新增数据集：在 `backend/app/datasets/` 实现契约并在注册表登记，样本放入 `storage/datasets/<id>/`。
- 新增模型：在 `backend/app/models/` 实现 Handler 并登记元信息；前端自动生成模型卡片。
- 新增案例：在 `backend/app/cases/` 实现案例；纯前端案例在 `frontend/src/cases/registry.tsx` 登记组件。
- 新增章节：修改 `frontend/src/chapters/config.ts` 并套用三段式页面模板。
- 学习引导：新案例同步补充 `frontend/src/cases/guidance.ts` 与 `frontend/src/chapters/learningPath.ts`。
- 上机实验：实验档案在 `frontend/src/data/labs/lab1~lab5.ts`，页面为 `frontend/src/pages/LabsPage.tsx` 与 `LabDetailPage.tsx`；案例加入实验的 `caseIds` 后，案例卡会自动显示「来自上机实验 N」徽标。
- 算法透明性：分割、边缘与阈值案例支持“OpenCV 库实现 / NumPy 手写步骤”切换，手写实现位于 `backend/app/algorithms/numpy_ops.py`。
