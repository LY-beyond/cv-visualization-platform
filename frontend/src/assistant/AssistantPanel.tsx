import { useState } from "react";

import { useAssistantStore } from "./context";
import {
  analyzeParams,
  answerQuestion,
  diagnoseText,
  explainCase,
  generateScript,
  type AssistantAction,
} from "./rules";

const ACTIONS: { id: AssistantAction; label: string }[] = [
  { id: "explain", label: "解释算法" },
  { id: "analyze", label: "分析参数" },
  { id: "diagnose", label: "诊断结果" },
  { id: "script", label: "生成讲解稿" },
];

/** 右下角学习助手：离线规则回答，可复制讲解稿。 */
export default function AssistantPanel() {
  const { context, open, setOpen, toggle } = useAssistantStore();
  const [reply, setReply] = useState("");
  const [question, setQuestion] = useState("");
  const [copied, setCopied] = useState(false);

  const runAction = (action: AssistantAction) => {
    if (!context) {
      setReply("请先在章节页打开一个案例，助手会读取当前参数、指标与步骤。");
      return;
    }
    setCopied(false);
    if (action === "explain") setReply(explainCase(context));
    else if (action === "analyze") setReply(analyzeParams(context));
    else if (action === "diagnose") setReply(diagnoseText(context));
    else setReply(generateScript(context));
  };

  const submitQuestion = () => {
    if (!context) {
      setReply("请先在章节页打开一个案例后再提问。");
      return;
    }
    setCopied(false);
    setReply(answerQuestion(question, context));
  };

  const copy = async () => {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label="打开学习助手"
        className="fixed bottom-5 right-5 z-40 rounded-full bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-brand-700"
      >
        学习助手
      </button>

      {open && (
        <aside className="fixed bottom-0 right-0 z-40 flex h-[72vh] w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:bottom-20 sm:right-5 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">学习助手（离线规则版）</p>
              <p className="truncate text-xs text-slate-400">
                {context
                  ? `${context.chapterTitle} · ${context.caseName ?? context.caseId ?? "未选择案例"}`
                  : "尚未选择案例"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300"
            >
              关闭
            </button>
          </div>

          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => runAction(action.id)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3">
            {reply ? (
              <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {reply}
              </pre>
            ) : (
              <p className="text-xs leading-relaxed text-slate-400">
                助手会读取当前案例的参数、指标与步骤。可点击上方动作，或输入“这个阈值合适吗”等问题。
                在线大模型未启用时，以上能力全部在本地规则引擎完成。
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitQuestion();
                }}
                placeholder="向助手提问…"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={submitQuestion}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
              >
                发送
              </button>
            </div>
            <button
              type="button"
              onClick={() => void copy()}
              disabled={!reply}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              {copied ? "已复制" : "复制回答"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
