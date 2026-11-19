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
| `ch1` | 第1章 计算机视觉概述 | 已建页面框架 |
| `ch2` | 第2章 基础知识 | 已建页面框架 |
| `ch2-stitch` | 第2章实例 特征点匹配与图像拼接 | 已建页面框架 |
| `ch3` | 第3章 图像分类 | 已建页面框架 |
| `ch4` | 第4章 图像语义分割 | 已建页面框架 |
| `ch5` | 第5章 目标检测 | 已建页面框架 |
| `ch6` | 第6章 识别 | 已建页面框架 |
| `ch7` / `ch8` / `ch9` | 目标跟踪 / 多目视觉 / 视觉问答 | 导航占位，后续扩展 |

后端已登记 6 个内置小样本数据集、10 个模型、37 个交互案例；算法实现按章节逐步补齐。

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

生产构建：`npm run build`，产物位于 `frontend/dist`。

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
