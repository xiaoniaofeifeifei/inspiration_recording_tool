import { useStore } from '../store/useStore';
import { ClassifyPicker } from './ClassifyPicker';
import { DraftAttachmentView } from './AttachmentView';
import { Modal } from './Modal';

export function SaveCard() {
  const draft = useStore((state) => state.draft);
  const target = useStore((state) => state.target);
  const saving = useStore((state) => state.saving);
  const setTarget = useStore((state) => state.setTarget);
  const setDraftTitle = useStore((state) => state.setDraftTitle);
  const setDraftText = useStore((state) => state.setDraftText);
  const removeDraftAttachment = useStore((state) => state.removeDraftAttachment);
  const commitDraft = useStore((state) => state.commitDraft);

  if (!draft) return null;

  return (
    <Modal onClose={() => void commitDraft()} labelledBy="save-card-title">
      <div className="flex items-start justify-between">
        <div>
          <h2 id="save-card-title" className="text-lg font-semibold text-slate-900">
            保存这条灵感
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            已经记下来了。直接关掉这张卡片也会保存到当前选中位置，不会丢。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {draft.attachments.map((attachment) => (
          <DraftAttachmentView
            key={attachment.meta.id}
            attachment={attachment}
            onRemove={() => removeDraftAttachment(attachment.meta.id)}
          />
        ))}

        <input
          value={draft.title}
          onChange={(event) => setDraftTitle(event.target.value)}
          placeholder="加个标题（可选）"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <textarea
          value={draft.text}
          onChange={(event) => setDraftText(event.target.value)}
          placeholder="想说点什么…（可选）"
          rows={3}
          className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <ClassifyPicker value={target} onChange={setTarget} />
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void commitDraft()}
        className="mt-5 w-full rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? '保存中…' : '保存'}
      </button>
    </Modal>
  );
}
