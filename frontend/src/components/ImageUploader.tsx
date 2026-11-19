import { useRef, useState } from "react";

export default function ImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setName(file.name);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
        {preview ? (
          <img src={preview} alt="上传预览" className="h-full w-full object-cover" />
        ) : (
          "示例图"
        )}
      </div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          上传图片
        </button>
        <p className="mt-1 truncate text-xs text-slate-400">
          {name || "未选择文件，可先使用内置示例"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}
