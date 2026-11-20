import { useState } from "react";

import type { LabGalleryItem } from "../../data/labs";

interface LabGalleryProps {
  items: LabGalleryItem[];
}

/** 实验结果画廊：缩略图网格 + 点击放大。 */
export default function LabGallery({ items }: LabGalleryProps) {
  const [active, setActive] = useState<LabGalleryItem | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <figure
            key={item.src}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setActive(item)}
              className="block w-full cursor-zoom-in bg-slate-50 dark:bg-slate-950"
              aria-label={`放大查看：${item.caption}`}
            >
              <img
                src={item.src}
                alt={item.caption}
                loading="lazy"
                className="h-48 w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
            <figcaption className="border-t border-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {item.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setActive(null)}
        >
          <div className="max-h-full w-full max-w-5xl overflow-auto" onClick={(event) => event.stopPropagation()}>
            <img
              src={active.src}
              alt={active.caption}
              className="mx-auto max-h-[80vh] w-auto rounded-xl bg-white object-contain"
            />
            <div className="mt-3 flex items-center justify-between gap-4 text-sm text-white">
              <p className="leading-relaxed">{active.caption}</p>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="shrink-0 rounded-lg border border-white/30 px-3 py-1 text-xs text-white/90 hover:bg-white/10"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
