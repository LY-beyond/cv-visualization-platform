interface KnowledgeCardProps {
  index: number;
  title: string;
  points: string[];
}

export default function KnowledgeCard({ index, title, points }: KnowledgeCardProps) {
  return (
    <article className="section-card">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          {index + 1}
        </span>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
