import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { FormEvent } from 'react';
import { deleteNotebook, deleteSection, renameNotebook, renameSection } from '../db';
import { ItemList } from '../components/ItemList';
import { PageShell } from '../components/PageShell';
import { PlusIcon } from '../components/icons';
import { useItems } from '../lib/hooks';
import { useStore } from '../store/useStore';

export function NotebookPage() {
  const { notebookId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const notebooks = useStore((state) => state.notebooks);
  const sections = useStore((state) => state.sections);
  const createSectionInNotebook = useStore((state) => state.createSectionInNotebook);
  const refresh = useStore((state) => state.refresh);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const notebook = notebooks.find((item) => item.id === notebookId);
  const own = sections.filter((section) => section.notebookId === notebookId);
  const requested = searchParams.get('section');
  const activeSectionId = requested && own.some((section) => section.id === requested) ? requested : null;

  const items = useItems(
    notebookId ? (activeSectionId ? { sectionId: activeSectionId } : { notebookId }) : {},
  );

  const activeSection = own.find((section) => section.id === activeSectionId) ?? null;

  const select = (sectionId: string | null) => {
    if (sectionId) setSearchParams({ section: sectionId });
    else setSearchParams({});
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!notebookId || !name.trim()) return;
    const section = await createSectionInNotebook(notebookId, name.trim());
    setName('');
    setCreating(false);
    select(section.id);
  };

  const handleRenameNotebook = async () => {
    if (!notebook) return;
    const next = window.prompt('重命名笔记本', notebook.name);
    if (!next || !next.trim()) return;
    await renameNotebook(notebook.id, next.trim());
    await refresh();
  };

  const handleDeleteNotebook = async () => {
    if (!notebook) return;
    if (!window.confirm(`删除「${notebook.name}」？里面的分区、灵感和录音、图片都会一起删掉。`)) return;
    await deleteNotebook(notebook.id);
    await refresh();
    navigate('/library');
  };

  const handleRenameSection = async () => {
    if (!activeSection) return;
    const next = window.prompt('重命名分区', activeSection.name);
    if (!next || !next.trim()) return;
    await renameSection(activeSection.id, next.trim());
    await refresh();
  };

  const handleDeleteSection = async () => {
    if (!activeSection) return;
    if (!window.confirm(`删除分区「${activeSection.name}」？里面的灵感会一起删掉。`)) return;
    await deleteSection(activeSection.id);
    await refresh();
    select(null);
  };

  if (!notebook) {
    return (
      <PageShell title="找不到这个笔记本" subtitle="它可能已经被删掉了。">
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          回到全部灵感
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={notebook.name}
      subtitle={`${own.length} 个分区`}
      actions={
        <>
          <button
            type="button"
            onClick={() => void handleRenameNotebook()}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            重命名
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteNotebook()}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50"
          >
            删除
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => select(null)}
          className={`rounded-full px-3 py-1.5 text-xs transition ${
            activeSectionId === null
              ? 'bg-brand-600 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-200'
          }`}
        >
          全部
        </button>
        {own.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => select(section.id)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              activeSectionId === section.id
                ? 'bg-brand-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-200'
            }`}
          >
            {section.name}
          </button>
        ))}

        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="分区名称"
              className="w-32 rounded-full border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              建
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-brand-300 hover:text-brand-600"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            新建分区
          </button>
        )}

        {activeSection ? (
          <span className="ml-auto flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => void handleRenameSection()}
              className="text-slate-500 hover:text-brand-600"
            >
              重命名分区
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteSection()}
              className="text-rose-500 hover:text-rose-600"
            >
              删除分区
            </button>
          </span>
        ) : null}
      </div>

      <ItemList
        items={items}
        empty={
          activeSection
            ? '这个分区还是空的，把灵感移过来或直接记一条。'
            : '这个笔记本还没有灵感，先去「记录」记一条吧。'
        }
      />
    </PageShell>
  );
}
