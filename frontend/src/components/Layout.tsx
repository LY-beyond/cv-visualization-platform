import { NavLink, Outlet } from "react-router-dom";

import AssistantPanel from "../assistant/AssistantPanel";
import { activeChapters, plannedChapters } from "../chapters/config";
import { useUiStore } from "../stores/uiStore";

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-300 ease-smooth",
    isActive
      ? "bg-gradient-to-r from-brand-500/90 via-brand-500/80 to-violet-500/80 text-white shadow-glow"
      : "text-slate-600 hover:bg-gradient-to-r hover:from-brand-50 hover:to-violet-50 hover:text-brand-700 dark:text-slate-300 dark:hover:from-brand-900/20 dark:hover:to-violet-900/20 dark:hover:text-brand-200",
  ].join(" ");
}

export default function Layout() {
  const { theme, toggleTheme, sidebarOpen, toggleSidebar } = useUiStore();

  /** 小屏点击章节后自动收起抽屉，桌面端保持展开。 */
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024 && sidebarOpen) toggleSidebar();
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-gradient-to-b from-white via-white to-brand-50/40 transition-transform duration-300 ease-smooth dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="relative border-b border-slate-200/80 px-5 py-6 dark:border-slate-800">
          {/* 渐变装饰光团 */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-brand-200/40 to-violet-200/30 blur-2xl dark:from-brand-700/20 dark:to-violet-700/10" />

          <NavLink to="/" className="relative block" onClick={closeSidebarOnMobile}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 via-violet-500 to-accent-500 shadow-glow">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v4H4z" />
                  <path d="M4 12h10v8H4z" />
                  <path d="M16 12h4v8h-4z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gradient-brand">
                Computer Vision
              </p>
            </div>
            <h1 className="mt-2 text-lg font-bold leading-snug text-slate-900 dark:text-white">
              <span className="text-gradient-brand">交互式</span>教学可视化平台
            </h1>
          </NavLink>

          {/* 桌面端收起侧栏 */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="收起侧栏"
            title="收起侧栏"
            className="absolute right-3 top-6 hidden h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-500 transition-all duration-200 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:border-brand-700 dark:hover:text-brand-200 lg:flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <nav className="scrollbar-thin relative flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">学习导航</p>
          <NavLink to="/" end className={navClass} onClick={closeSidebarOnMobile}>
            <span className="w-8 shrink-0 text-xs font-mono opacity-70">00</span>
            <span className="truncate">平台首页</span>
          </NavLink>
          <NavLink to="/path" className={navClass} onClick={closeSidebarOnMobile}>
            <span className="w-8 shrink-0 text-xs font-mono opacity-70">↗</span>
            <span className="truncate">学习路径</span>
          </NavLink>
          <NavLink to="/graph" className={navClass} onClick={closeSidebarOnMobile}>
            <span className="w-8 shrink-0 text-xs font-mono opacity-70">◎</span>
            <span className="truncate">知识图谱</span>
          </NavLink>
          <NavLink to="/labs" className={navClass} onClick={closeSidebarOnMobile}>
            <span className="w-8 shrink-0 text-xs font-mono opacity-70">▦</span>
            <span className="truncate">上机实验中心</span>
          </NavLink>

          <div className="my-2 hr-gradient" />

          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">课程章节</p>
          {activeChapters.map((chapter) => (
            <NavLink
              key={chapter.id}
              to={`/chapters/${chapter.id}`}
              className={navClass}
              onClick={closeSidebarOnMobile}
            >
              <span className="w-8 shrink-0 text-xs font-mono opacity-70">{chapter.order}</span>
              <span className="truncate">{chapter.title}</span>
            </NavLink>
          ))}
          {plannedChapters.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-4 text-xs font-medium text-slate-400">后续扩展</p>
              {plannedChapters.map((chapter) => (
                <NavLink
                  key={chapter.id}
                  to={`/chapters/${chapter.id}`}
                  className={navClass}
                  onClick={closeSidebarOnMobile}
                >
                  <span className="w-8 shrink-0 text-xs font-mono opacity-70">{chapter.order}</span>
                  <span className="flex-1 truncate">{chapter.title}</span>
                  <span className="badge bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    占位
                  </span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-slate-200/80 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full rounded-xl bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-left text-sm text-slate-600 transition-all duration-200 hover:from-brand-50 hover:to-violet-50 hover:text-brand-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300 dark:hover:from-brand-900/20 dark:hover:to-violet-900/20 dark:hover:text-brand-200"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-violet-400 text-[10px] font-bold text-white">
                {theme === "dark" ? "☀" : "☾"}
              </span>
              {theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
            </span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="关闭导航"
          onClick={toggleSidebar}
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <div
        className={[
          "flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-smooth",
          sidebarOpen ? "lg:pl-72" : "lg:pl-0",
        ].join(" ")}
      >
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/80 lg:px-8">
          {/* 渐变底边线 */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-brand-500/60 via-violet-500/60 to-accent-400/60 opacity-60" />

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "收起侧栏" : "展开侧栏"}
            title={sidebarOpen ? "收起侧栏" : "展开侧栏"}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 transition-all duration-200 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-200"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
            <span className="hidden sm:inline">{sidebarOpen ? "收起侧栏" : "展开侧栏"}</span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span className="text-gradient-brand">计算机视觉</span> · 课程大作业
            </p>
            <p className="truncate text-xs text-slate-400">知识点讲解 + 可交互案例 + 模型训练与对比</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>

        <footer className="relative border-t border-slate-200 px-4 py-5 text-center text-xs text-slate-400 dark:border-slate-800 lg:px-8">
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-brand-400/30 via-violet-400/30 to-accent-400/30" />
          <span className="text-gradient-brand font-medium">FastAPI + React + Vite + TypeScript</span> · 内容依据《计算机视觉》课程课件
        </footer>
      </div>

      <AssistantPanel />
    </div>
  );
}
