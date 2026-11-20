"""NumPy 手写算子与 OpenCV 实现的一致性测试。

运行方式（在 backend 目录）：
    .venv\\Scripts\\python.exe -m unittest tests.test_numpy_ops -v
"""

import unittest

import cv2
import numpy as np

from app.algorithms import numpy_ops


class NumPyOpsTest(unittest.TestCase):
    def setUp(self) -> None:
        rng = np.random.default_rng(7)
        self.image = rng.integers(0, 256, size=(64, 64, 3), dtype=np.uint8)
        self.gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)

    def test_gray_matches_opencv(self) -> None:
        result = numpy_ops.bgr_to_gray(self.image)
        expected = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        self.assertEqual(result.shape, expected.shape)
        diff = np.abs(result.astype(np.int16) - expected.astype(np.int16))
        self.assertLessEqual(int(diff.max()), 1)

    def test_convolve_matches_opencv(self) -> None:
        kernel = np.array([[0, -1, 0], [-1, 4, -1], [0, -1, 0]], dtype=np.float32)
        result = numpy_ops.convolve2d(self.gray, kernel)
        expected = cv2.filter2D(self.gray, cv2.CV_32F, kernel, borderType=cv2.BORDER_REPLICATE)
        self.assertLess(float(np.abs(result - expected).max()), 1e-3)

    def test_otsu_matches_opencv(self) -> None:
        threshold = numpy_ops.otsu_threshold(self.gray)
        expected, _ = cv2.threshold(self.gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        self.assertLessEqual(abs(threshold - int(expected)), 2)

    def test_iterative_threshold_reasonable(self) -> None:
        threshold = numpy_ops.iterative_threshold(self.gray)
        self.assertGreaterEqual(threshold, 0)
        self.assertLessEqual(threshold, 255)

    def test_kmeans_is_stable_with_seed(self) -> None:
        pixels = self.image.reshape(-1, 3)
        first = numpy_ops.kmeans_pixels(pixels, 4, 12, seed=11)
        second = numpy_ops.kmeans_pixels(pixels, 4, 12, seed=11)
        self.assertTrue(np.array_equal(first[0], second[0]))
        self.assertTrue(np.allclose(first[1], second[1]))
        labels, centers, frames, history, used = first
        self.assertEqual(labels.shape[0], pixels.shape[0])
        self.assertEqual(centers.shape, (4, 3))
        self.assertGreater(len(frames), 0)
        self.assertGreaterEqual(used, 1)
        self.assertLessEqual(used, 12)
        self.assertGreaterEqual(len(history), 1)

    def test_canny_steps_shapes(self) -> None:
        result = numpy_ops.canny_steps(self.gray, 50, 150, sigma=1.2)
        for key in ("blurred", "magnitude", "suppressed", "strong", "edges"):
            self.assertEqual(result[key].shape, self.gray.shape, key)
        self.assertEqual(int(result["edges"].sum()), int(result["edges"].astype(bool).sum()))
        summary = numpy_ops.canny_steps_summary(self.gray, 50, 150, sigma=1.2)
        self.assertGreater(summary["kernel_size"], 0)
        self.assertGreaterEqual(summary["edge_pixels"], summary["strong_pixels"])

    def test_depth_from_disparity(self) -> None:
        disparity = np.array([2.0, 4.0, 0.0], dtype=np.float32)
        depth = numpy_ops.depth_from_disparity(disparity, focal=500.0, baseline=0.1)
        self.assertAlmostEqual(float(depth[0]), 25.0, places=4)
        self.assertAlmostEqual(float(depth[1]), 12.5, places=4)
        self.assertTrue(np.isnan(float(depth[2])))

    def test_cosine_similarity(self) -> None:
        self.assertAlmostEqual(numpy_ops.cosine_similarity([1, 0, 0], [1, 0, 0]), 1.0)
        self.assertAlmostEqual(numpy_ops.cosine_similarity([1, 0], [0, 1]), 0.0)
        self.assertAlmostEqual(numpy_ops.cosine_similarity([0, 0], [1, 0]), 0.0)


if __name__ == "__main__":
    unittest.main()
