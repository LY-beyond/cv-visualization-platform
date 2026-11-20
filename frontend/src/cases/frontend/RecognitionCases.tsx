import { useState } from "react";

import type { CaseMeta } from "../../api/types";
import ParamPanel from "../../components/ParamPanel";
import CaseFrame from "../CaseFrame";
import { numberValue, useCaseValues } from "../params";

const MODES = [
  {
    id: "enroll",
    name: "注册",
    summary: "建立模板库",
    flow: ["采集生物特征", "质量评估", "特征提取", "模板入库"],
    detail: "注册阶段为每个用户保存一个（或多个）特征模板，模板质量直接决定后续比对上限。",
  },
  {
    id: "verify",
    name: "1:1 验证",
    summary: "确认是不是本人",
    flow: ["输入特征", "声明身份", "调取对应模板", "距离 < 阈值？", "接受 / 拒绝"],
    detail: "验证只需与声明的身份比对一次，速度快，常用于门禁、手机解锁与支付确认。",
  },
  {
    id: "identify",
    name: "1:N 辨识",
    summary: "判断是谁",
    flow: ["输入特征", "遍历模板库", "取最高相似度", "高于阈值？", "返回身份 / 陌生人"],
    detail: "辨识需要与库中全部模板比较，库越大误识风险越高，需要更严格的阈值与质量控制。",
  },
];

export function RecognitionModes({ meta }: { meta: CaseMeta }) {
  const [modeId, setModeId] = useState("verify");
  const mode = MODES.find((item) => item.id === modeId) ?? MODES[1];

  return (
    <CaseFrame meta={meta}>
      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setModeId(item.id)}
            className={[
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              item.id === modeId
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            ].join(" ")}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {mode.flow.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {step}
            </span>
            {index < mode.flow.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {mode.name} · {mode.summary}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{mode.detail}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["比对次数", mode.id === "identify" ? "N 次" : "1 次"],
          ["主要风险", mode.id === "identify" ? "误识（错认成他人）" : "误拒（本人被拒绝）"],
          ["典型场景", mode.id === "enroll" ? "人员建档" : mode.id === "verify" ? "门禁、解锁" : "刑侦、走失查找"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{value}</p>
          </div>
        ))}
      </div>
    </CaseFrame>
  );
}

const FEATURES = [
  { name: "指纹", collect: "高", unique: "高", stable: "高", security: "中", note: "接触式采集，成本低，应用最成熟；手指磨损或潮湿会影响质量。" },
  { name: "虹膜", collect: "中", unique: "极高", stable: "极高", security: "高", note: "非接触、稳定性好，但采集设备成本较高，需要用户配合。" },
  { name: "人脸", collect: "极高", unique: "中", stable: "中", security: "中", note: "非接触、体验好，受光照姿态与年龄变化影响较大。" },
  { name: "声纹", collect: "高", unique: "中", stable: "中", security: "中", note: "可通过电话远程采集，易受噪声与情绪影响。" },
  { name: "步态", collect: "高", unique: "中", stable: "中", security: "中", note: "远距离非配合采集，适合视频监控场景。" },
];

export function BiometricCompare({ meta }: { meta: CaseMeta }) {
  const [selected, setSelected] = useState(2);
  return (
    <CaseFrame meta={meta}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-400 dark:border-slate-700">
              <th className="py-2 pr-3 font-medium">生物特征</th>
              <th className="px-3 py-2 font-medium">可采集性</th>
              <th className="px-3 py-2 font-medium">唯一性</th>
              <th className="px-3 py-2 font-medium">稳定性</th>
              <th className="px-3 py-2 font-medium">安全性</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((item, index) => (
              <tr
                key={item.name}
                onClick={() => setSelected(index)}
                className={[
                  "cursor-pointer border-b border-slate-100 transition-colors dark:border-slate-800",
                  index === selected ? "bg-brand-50 dark:bg-brand-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                ].join(" ")}
              >
                <td className="py-2 pr-3 font-medium text-slate-700 dark:text-slate-200">{item.name}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.collect}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.unique}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.stable}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.security}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        {FEATURES[selected].name}：{FEATURES[selected].note}
      </p>
    </CaseFrame>
  );
}

const GENUINE = [0.28, 0.34, 0.4, 0.47, 0.52, 0.58, 0.64, 0.7, 0.78, 0.86, 0.96, 1.12];
const IMPOSTOR = [0.72, 0.88, 1.0, 1.08, 1.18, 1.3, 1.42, 1.6, 1.78, 1.94];
const MIN_DISTANCE = 0.2;
const MAX_DISTANCE = 2.0;

function position(distance: number): string {
  const ratio = (distance - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE);
  return `${Math.min(100, Math.max(0, ratio * 100))}%`;
}

export function DistanceMatch({ meta }: { meta: CaseMeta }) {
  const { values, setValue } = useCaseValues(meta.params);
  const threshold = numberValue(values, "threshold", 1.0);

  const acceptedGenuine = GENUINE.filter((value) => value <= threshold).length;
  const acceptedImpostor = IMPOSTOR.filter((value) => value <= threshold).length;
  const far = acceptedImpostor / IMPOSTOR.length;
  const frr = (GENUINE.length - acceptedGenuine) / GENUINE.length;

  return (
    <CaseFrame meta={meta}>
      <ParamPanel specs={meta.params} values={values} onChange={setValue} />
      <div className="space-y-2">
        <div className="relative h-24 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-200 dark:bg-slate-700" />
          <div
            className="absolute top-0 h-full border-l-2 border-dashed border-brand-500"
            style={{ left: position(threshold) }}
          />
          <span
            className="absolute -top-1 -translate-x-1/2 rounded bg-brand-600 px-1.5 text-[10px] text-white"
            style={{ left: position(threshold) }}
          >
            T={threshold.toFixed(2)}
          </span>
          {GENUINE.map((value, index) => (
            <span
              key={`g-${index}`}
              className={[
                "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                value <= threshold ? "bg-emerald-500" : "border-2 border-emerald-500 bg-white",
              ].join(" ")}
              style={{ left: position(value), top: `${28 + (index % 3) * 12}%` }}
              title={`同类距离 ${value}`}
            />
          ))}
          {IMPOSTOR.map((value, index) => (
            <span
              key={`i-${index}`}
              className={[
                "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                value <= threshold ? "bg-rose-500" : "border-2 border-rose-400 bg-white",
              ].join(" ")}
              style={{ left: position(value), top: `${60 + (index % 2) * 14}%` }}
              title={`异类距离 ${value}`}
            />
          ))}
          <span className="absolute bottom-1 left-2 text-[10px] text-slate-400">0.2</span>
          <span className="absolute bottom-1 right-2 text-[10px] text-slate-400">2.0</span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />同类距离</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />异类距离</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-white" />超过阈值被拒绝</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["错误接受率 FAR", `${(far * 100).toFixed(1)}%`],
          ["错误拒绝率 FRR", `${(frr * 100).toFixed(1)}%`],
          ["同类通过", `${acceptedGenuine} / ${GENUINE.length}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-0.5 font-mono text-sm text-slate-700 dark:text-slate-200">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        阈值越大越宽松：FAR 上升、FRR 下降。虹膜识别常用加权汉明距离，人脸识别常用余弦距离，二者都需要在 FAR 与 FRR 之间做权衡。
      </p>
    </CaseFrame>
  );
}
