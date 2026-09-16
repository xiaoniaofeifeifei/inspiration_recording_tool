import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { useStore } from '../store/useStore';
import { ChevronIcon, FolderIcon, InboxIcon, ListIcon, MicIcon, SparkleIcon } from './icons';

function navClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
    isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export function Sidebar() {
  const notebooks = useStore((state) => state.notebooks);
  const sections = useStore((state) => state.sections);
  const inboxCount = useStore((state) => state.inboxCount);
  const createNotebookWithSection = useStore((state) => state.createNotebookWithSection);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const section = await createNotebookWithSection(trimmed);
    setName('');
    setCreating(false);
    if (section.notebookId) {
      setExpanded((previous) => ({ ...previous, [section.notebookId as string]: true }));
      navigate(`/notebook/${section.notebookId}?section=${section.id}`);
    }
  };

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white">
          <SparkleIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm leading-tight font-semibold text-slate-900">闪记</p>
          <p className="text-[11px] text-slate-400">打开就能记</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        <NavLink to="/" end className={navClass}>
          <MicIcon className="h-5 w-5" />
          记录
        </NavLink>
        <NavLink to="/inbox" className={navClass}>
          <InboxIcon className="h-5 w-5" />
          新灵感
          {inboxCount > 0 ? (
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">
              {inboxCount}
            </span>
          ) : null}
        </NavLink>
        <NavLink to="/library" className={navClass}>
          <ListIcon className="h-5 w-5" />
          全部灵感
        </NavLink>

        <div className="pt-4">
          <p className="px-3 pb-2 text-[11px] font-medium tracking-wide text-slate-400">笔记本</p>
          {notebooks.map((notebook) => {
            const own = sections.filter((section) => section.notebookId === notebook.id);
            const isOpen = expanded[notebook.id] ?? false;
            return (
              <div key={notebook.id}>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={isOpen ? '收起分区' : '展开分区'}
                    onClick={() =>
                      setExpanded((previous) => ({ ...previous, [notebook.id]: !isOpen }))
                    }
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
                  >
                    <ChevronIcon
                      className={`h-3.5 w-3.5 transition ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <NavLink
                    to={`/notebook/${notebook.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: notebook.color }}
                    />
                    <span className="truncate">{notebook.name}</span>
                    <span className="ml-auto text-[11px] text-slate-400">{own.length}</span>
                  </NavLink>
                </div>
                {isOpen ? (
                  <div className="ml-6 space-y-0.5 pb-1">
                    {own.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-slate-400">还没有分区</p>
                    ) : (
                      own.map((section) => (
                        <NavLink
                          key={section.id}
                          to={`/notebook/${notebook.id}?section=${section.id}`}
                          className="block truncate rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                        >
                          {section.name}
                        </NavLink>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}

          {creating ? (
            <form onSubmit={handleCreate} className="mt-2 flex gap-1.5 px-1">
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="笔记本名称"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-medium text-white"
              >
                建
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-600 hover:bg-brand-50"
            >
              <FolderIcon className="h-4 w-4" />
              新建笔记本
            </button>
          )}
        </div>
      </nav>

      <p className="px-5 pb-4 text-[11px] leading-relaxed text-slate-400">
        数据只存在这台设备的浏览器里。清空浏览器数据会一起清掉，重要灵感记得别删缓存。
      </p>
    </aside>
  );
}
