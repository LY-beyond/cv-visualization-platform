"""阶段四回归测试：案例契约、注册一致性与离线素材检查。

运行方式（在 backend 目录）：
    .venv\\Scripts\\python.exe -m unittest discover -s tests -v
"""

import unittest
from pathlib import Path
from typing import Any, Dict

from app.cases.registry import case_registry
from app.datasets.registry import dataset_registry
from app.models.registry import model_registry
from app.schemas.case import CaseMeta

import app.cases.builtin  # noqa: E402,F401  导入即完成内置案例注册

ROOT = Path(__file__).resolve().parents[2]
COURSE_ASSETS = ROOT / "backend" / "storage" / "assets" / "course"


def default_params(meta: CaseMeta) -> Dict[str, Any]:
    """按元信息中的默认值构造参数，模拟前端首次加载。"""
    return {
        spec.name: spec.default
        for spec in meta.params
        if spec.default is not None
    }


class CaseContractTest(unittest.TestCase):
    def test_registry_has_enough_cases(self) -> None:
        metas = case_registry.list_meta()
        self.assertGreaterEqual(len(metas), 25)
        self.assertTrue(any(meta.chapter == "ch3" for meta in metas))

    def test_all_implemented_cases_execute(self) -> None:
        metas = [meta for meta in case_registry.list_meta() if meta.implemented]
        self.assertGreaterEqual(len(metas), 20)
        for meta in metas:
            with self.subTest(case=meta.id):
                case = case_registry.get(meta.id)
                output = case.execute(default_params(meta), None)
                self.assertIsInstance(output.images, list)
                self.assertIsInstance(output.charts, list)
                self.assertIsInstance(output.steps, list)
                self.assertIsInstance(output.metrics, dict)
                self.assertIsInstance(output.message, str)
                for image in output.images:
                    self.assertTrue(
                        str(image.get("src", "")).startswith("data:image/"),
                        f"{meta.id} 返回了非内联图片",
                    )
                    self.assertTrue(image.get("title"))
                for chart in output.charts:
                    self.assertIsInstance(chart.get("option"), dict)

    def test_placeholder_cases_are_not_implemented(self) -> None:
        from app.cases.implementations import IMPLEMENTATIONS

        for meta in case_registry.list_meta():
            if meta.id not in IMPLEMENTATIONS:
                self.assertFalse(meta.implemented, f"{meta.id} 缺少实现类却标记为已实现")
            else:
                self.assertTrue(meta.implemented, f"{meta.id} 已注册实现但未标记 implemented")


class RegistryTest(unittest.TestCase):
    def test_dataset_registry(self) -> None:
        meta = dataset_registry.get("mnist_subset").meta
        self.assertTrue(meta.class_names)
        self.assertGreater(len(meta.class_names), 0)

    def test_model_registry(self) -> None:
        for model_id in ("svm", "lenet5", "kmeans"):
            meta = model_registry.get(model_id).meta
            self.assertTrue(meta.name)

    def test_pretrained_model_metadata(self) -> None:
        """预训练模型应携带可展示的预处理、标签与指标。"""
        resnet = model_registry.get("resnet50").meta
        self.assertIsNotNone(resnet.preprocess)
        self.assertEqual(len(resnet.preprocess.input_size), 2)
        self.assertTrue(resnet.metrics)

        yolo = model_registry.get("yolo_v3").meta
        self.assertIsNotNone(yolo.preprocess)
        self.assertEqual(len(yolo.labels), 80)
        self.assertIn("person", yolo.labels)


class OfflineAssetTest(unittest.TestCase):
    def test_course_figures_exist(self) -> None:
        expected = [
            "ch1/ch1-why.jpg",
            "ch1/ch1-challenges.jpg",
            "ch2/ch2-depth.jpg",
            "ch2/ch2-gradient.jpg",
            "ch2/ch2-conv.jpg",
            "ch2-stitch/stitch-transform.jpg",
            "ch2-stitch/stitch-ransac.jpg",
            "ch2-stitch/stitch-blend.jpg",
            "ch3/ch3-bow.jpg",
            "ch3/ch3-lenet.jpg",
            "ch3/ch3-vgg.jpg",
            "ch4/ch4-fcn.jpg",
            "ch4/ch4-deeplab.jpg",
            "ch5/ch5-rcnn.jpg",
            "ch5/ch5-two-stage.jpg",
            "ch5/ch5-yolov3.jpg",
            "ch6/ch6-fingerprint.jpg",
            "ch6/ch6-retinaface.jpg",
            "ch6/ch6-arcface.jpg",
        ]
        for relative in expected:
            self.assertTrue((COURSE_ASSETS / relative).is_file(), f"缺少课件图片: {relative}")

    def test_frontend_has_no_remote_resources(self) -> None:
        """离线兜底：前端源码与入口 HTML 不应引用外网资源。"""
        targets = [ROOT / "frontend" / "index.html"]
        targets.extend((ROOT / "frontend" / "src").rglob("*.ts"))
        targets.extend((ROOT / "frontend" / "src").rglob("*.tsx"))
        targets.extend((ROOT / "frontend" / "src").rglob("*.css"))
        targets.extend((ROOT / "frontend" / "public" / "models").rglob("*.json"))
        for path in targets:
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("http://", text, f"{path.name} 含有外网 http 资源")
            self.assertNotIn("https://", text, f"{path.name} 含有外网 https 资源")


if __name__ == "__main__":
    unittest.main()
