import { NavLink, Outlet } from "react-router-dom";

import { activeChapters, plannedChapters } from "../chapters/config";
import { useUiStore } from "../stores/uiStore";

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
    isActive
      ? "bg-brand-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  ].join(" ");
}

export default function Layout() {
  const { theme, toggleTheme, sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <NavLink to="/" className="block" onClick={() => sidebarOpen && toggleSidebar()}>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Computer Vision</p>
            <h1 className="mt-1 text-lg font-semibold leading-snug text-slate-900 dark:text-white">
              交互式教学可视化平台
            </h1>
          </NavLink>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-1 text-xs font-medium text-slate-400">课程章节</p>
          {activeChapters.map((chapter) => (
            <NavLink key={chapter.id} to={`/chapters/${chapter.id}`} className={navClass}>
              <span className="w-8 shrink-0 text-xs font-mono opacity-70">{chapter.order}</span>
              <span className="truncate">{chapter.title}</span>
            </NavLink>
          ))}
          <p className="px-3 pb-1 pt-4 text-xs font-medium text-slate-400">后续扩展</p>
          {plannedChapters.map((chapter) => (
            <NavLink key={chapter.id} to={`/chapters/${chapter.id}`} className={navClass}>
              <span className="w-8 shrink-0 text-xs font-mono opacity-70">{chapter.order}</span>
              <span className="flex-1 truncate">{chapter.title}</span>
              <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                占位
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="关闭导航"
          onClick={toggleSidebar}
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:px-8">
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 lg:hidden"
          >
            导航
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              计算机视觉 · 课程大作业
            </p>
            <p className="truncate text-xs text-slate-400">知识点讲解 + 可交互案例 + 模型训练与对比</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-400 dark:border-slate-800 lg:px-8">
          FastAPI + React + Vite + TypeScript · 内容依据《计算机视觉》课程课件
        </footer>
      </div>
    </div>
  );
}
