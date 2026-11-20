"""把实验三的 LeNet Keras 权重转换为浏览器可用的 ONNX 模型。

来源：实验项目/第三次上机实验/上机练习2/lenet/pretrained/LeNet-teacher.keras
输出：frontend/public/models/lenet-mnist/model.onnx + config.json

转换不依赖 TensorFlow：直接读取 .keras（zip + HDF5 权重），
在 PyTorch 中重建同结构网络并复制参数，再用 onnxruntime 与
实验保留的 mnist-0..9 样例做一致性校验。
"""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import h5py
import numpy as np
import onnx
import onnxruntime as ort
import torch
from PIL import Image
from torch import nn

ROOT = Path(__file__).resolve().parents[1]
KERAS_PATH = (
    ROOT
    / "实验项目"
    / "第三次上机实验"
    / "上机练习2"
    / "lenet"
    / "pretrained"
    / "LeNet-teacher.keras"
)
SAMPLE_DIR = ROOT / "实验项目" / "第三次上机实验" / "上机练习2" / "lenet" / "images"
OUT_DIR = ROOT / "frontend" / "public" / "models" / "lenet-mnist"


class LeNet(nn.Module):
    """与 Keras 配置逐层对应：C6-same → AP2 → C16 → AP2 → F120 → F84 → F10。"""

    def __init__(self) -> None:
        super().__init__()
        self.conv1 = nn.Conv2d(1, 6, 5, padding=2)
        self.conv2 = nn.Conv2d(6, 16, 5)
        self.pool = nn.AvgPool2d(2, 2)
        self.fc1 = nn.Linear(16 * 5 * 5, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, 10)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pool(torch.tanh(self.conv1(x)))
        x = self.pool(torch.tanh(self.conv2(x)))
        # Keras 以 channels_last 展平，这里先转 NHWC，保证与全连接权重顺序一致
        x = x.permute(0, 2, 3, 1).flatten(1)
        x = torch.tanh(self.fc1(x))
        x = torch.tanh(self.fc2(x))
        return torch.softmax(self.fc3(x), dim=1)


def load_weights(path: Path) -> tuple[dict[str, np.ndarray], dict]:
    with zipfile.ZipFile(path) as archive:
        config = json.loads(archive.read("config.json"))
        with h5py.File(io.BytesIO(archive.read("model.weights.h5")), "r") as weights:
            layers = config["config"]["layers"]
            convs = [layer for layer in layers if layer["class_name"] == "Conv2D"]
            denses = [layer for layer in layers if layer["class_name"] == "Dense"]
            if len(convs) != 2 or len(denses) != 3:
                raise RuntimeError("LeNet 结构不符合预期，请检查 Keras 配置")

            def read(name: str, index: int) -> np.ndarray:
                return np.array(weights[f"layers/{name}/vars/{index}"])

            tensors = {
                "conv1.weight": read(convs[0]["config"]["name"], 0),
                "conv1.bias": read(convs[0]["config"]["name"], 1),
                "conv2.weight": read(convs[1]["config"]["name"], 0),
                "conv2.bias": read(convs[1]["config"]["name"], 1),
                "fc1.weight": read(denses[0]["config"]["name"], 0),
                "fc1.bias": read(denses[0]["config"]["name"], 1),
                "fc2.weight": read(denses[1]["config"]["name"], 0),
                "fc2.bias": read(denses[1]["config"]["name"], 1),
                "fc3.weight": read(denses[2]["config"]["name"], 0),
                "fc3.bias": read(denses[2]["config"]["name"], 1),
            }
    return tensors, config


def build_model(tensors: dict[str, np.ndarray]) -> LeNet:
    model = LeNet().eval()
    with torch.no_grad():
        # Keras 卷积核为 [kh, kw, in, out]，PyTorch 需要 [out, in, kh, kw]
        model.conv1.weight.copy_(torch.from_numpy(tensors["conv1.weight"].transpose(3, 2, 0, 1)))
        model.conv1.bias.copy_(torch.from_numpy(tensors["conv1.bias"]))
        model.conv2.weight.copy_(torch.from_numpy(tensors["conv2.weight"].transpose(3, 2, 0, 1)))
        model.conv2.bias.copy_(torch.from_numpy(tensors["conv2.bias"]))
        model.fc1.weight.copy_(torch.from_numpy(tensors["fc1.weight"].T))
        model.fc1.bias.copy_(torch.from_numpy(tensors["fc1.bias"]))
        model.fc2.weight.copy_(torch.from_numpy(tensors["fc2.weight"].T))
        model.fc2.bias.copy_(torch.from_numpy(tensors["fc2.bias"]))
        model.fc3.weight.copy_(torch.from_numpy(tensors["fc3.weight"].T))
        model.fc3.bias.copy_(torch.from_numpy(tensors["fc3.bias"]))
    return model


def preprocess(path: Path) -> np.ndarray:
    """与前端一致：灰度、28×28、/255、NCHW。"""
    image = Image.open(path).convert("L").resize((28, 28), Image.BILINEAR)
    array = np.asarray(image, dtype=np.float32) / 255.0
    return array.reshape(1, 1, 28, 28)


def main() -> None:
    tensors, _ = load_weights(KERAS_PATH)
    model = build_model(tensors)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    onnx_path = OUT_DIR / "model.onnx"
    dummy = torch.zeros(1, 1, 28, 28, dtype=torch.float32)
    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        input_names=["input"],
        output_names=["prob"],
        opset_version=18,
        dynamo=False,
        dynamic_axes={"input": {0: "batch"}, "prob": {0: "batch"}},
    )

    # 新版导出器可能把权重写到 model.onnx.data；重新保存为单文件，便于浏览器直接加载
    proto = onnx.load(str(onnx_path))
    onnx.save(proto, str(onnx_path))
    (OUT_DIR / "model.onnx.data").unlink(missing_ok=True)

    # 浏览器端实际使用纯 JS 前向，导出一份按层顺序拼接的 float32 权重
    order = [
        "conv1.weight",
        "conv1.bias",
        "conv2.weight",
        "conv2.bias",
        "fc1.weight",
        "fc1.bias",
        "fc2.weight",
        "fc2.bias",
        "fc3.weight",
        "fc3.bias",
    ]
    payload = np.concatenate(
        [model.state_dict()[name].detach().cpu().numpy().astype(np.float32).ravel() for name in order]
    )
    (OUT_DIR / "weights.bin").write_bytes(payload.tobytes())

    config = {
        "name": "LeNet-5 手写数字（实验三教师模型）",
        "task": "classification",
        "inputSize": [28, 28],
        "layout": "NCHW",
        "channels": 1,
        "mean": [0.0],
        "std": [1.0],
        "labels": [str(i) for i in range(10)],
        "preprocess": "灰度 → 28×28 → /255；MNIST 原图为黑底白字",
        "source": "实验项目/第三次上机实验/上机练习2/lenet/pretrained/LeNet-teacher.keras",
        "weights": "weights.bin",
        "weightsOrder": order,
        "metrics": {"test_accuracy": 0.9812, "params": 61706},
        "note": "结构与 Keras 配置逐层一致：C6(pad=2)-AP2-C16-AP2-F120-F84-F10，激活 tanh，输出 softmax。网页端用纯 JS 前向执行。",
    }
    (OUT_DIR / "config.json").write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    correct = 0
    total = 0
    for digit in range(10):
        sample = SAMPLE_DIR / f"mnist-{digit}.png"
        if not sample.exists():
            continue
        probs = session.run(["prob"], {"input": preprocess(sample)})[0][0]
        predicted = int(probs.argmax())
        total += 1
        correct += int(predicted == digit)
        print(f"mnist-{digit}.png → 预测 {predicted}，置信度 {probs[predicted]:.4f}")
    print(f"样例一致率：{correct}/{total}")
    print(f"模型大小：{onnx_path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
