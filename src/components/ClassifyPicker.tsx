import { useState } from 'react';
import type { FormEvent } from 'react';
import { useStore } from '../store/useStore';
import { INBOX_ID, INBOX_NAME } from '../types';
import { notebookOf } from '../lib/labels';
import type { Target } from '../lib/labels';

interface ClassifyPickerProps {
  value: Target;
  onChange: (target: Target) => void;
}

export function ClassifyPicker({ value, onChange }: ClassifyPickerProps) {
  const notebooks = useStore((state) => state.notebooks);
  const sections = useStore((state) => state.sections);
  const createNotebookWithSection = useStore((state) => state.createNotebookWithSection);
  const createSectionInNotebook = useStore((state) => state.createSectionInNotebook);

  const [mode, setMode] = useState<'idle' | 'notebook' | 'section'>('idle');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const currentNotebookId =
    value.sectionId === INBOX_ID ? null : notebookOf(sections, value.sectionId);

  const handleSelect = (sectionId: string) => {
    onChange({
      sectionId,
      notebookId: sectionId === INBOX_ID ? null : notebookOf(sections, sectionId),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      if (mode === 'notebook') {
        const section = await createNotebookWithSection(trimmed);
        onChange({ notebookId: section.notebookId, sectionId: section.id });
      } else if (mode === 'section' && currentNotebookId) {
        const section = await createSectionInNotebook(currentNotebookId, trimmed);
        onChange({ notebookId: section.notebookId, sectionId: section.id });
      }
      setMode('idle');
      setName('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-slate-500">存到</span>
      <select
        value={value.sectionId}
        onChange={(event) => handleSelect(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        <option value={INBOX_ID}>{INBOX_NAME}（收件箱）</option>
        {notebooks.map((notebook) => {
          const own = sections.filter((section) => section.notebookId === notebook.id);
          return (
            <optgroup key={notebook.id} label={notebook.name}>
              {own.length === 0 ? (
                <option value={`empty:${notebook.id}`} disabled>
                  （还没有分区）
                </option>
              ) : (
                own.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))
              )}
            </optgroup>
          );
        })}
      </select>

      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-600">
          <button
            type="button"
            className="hover:underline"
            onClick={() => {
              setMode('notebook');
              setName('');
            }}
          >
            ＋ 新建笔记本
          </button>
          {currentNotebookId ? (
            <button
              type="button"
              className="hover:underline"
              onClick={() => {
                setMode('section');
                setName('');
              }}
            >
              ＋ 在这个笔记本里新建分区
            </button>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={mode === 'notebook' ? '笔记本名称' : '分区名称'}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            创建
          </button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            取消
          </button>
        </form>
      )}
    </div>
  );
}
