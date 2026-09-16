import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useItem } from '../lib/hooks';
import type { Target } from '../lib/labels';
import { ClassifyPicker } from './ClassifyPicker';
import { Modal } from './Modal';

function MoveDialog({ itemId }: { itemId: string }) {
  const item = useItem(itemId);
  const closeMoveDialog = useStore((state) => state.closeMoveDialog);
  const moveItemTo = useStore((state) => state.moveItemTo);
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    if (item) setTarget({ notebookId: item.notebookId, sectionId: item.sectionId });
  }, [item]);

  if (!item || !target) return null;

  return (
    <Modal onClose={closeMoveDialog} labelledBy="move-dialog-title">
      <h2 id="move-dialog-title" className="text-lg font-semibold text-slate-900">
        把这条灵感移到
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        {item.title || item.text.trim().slice(0, 24) || '这条灵感'}
      </p>
      <div className="mt-4">
        <ClassifyPicker value={target} onChange={setTarget} />
      </div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={closeMoveDialog}
          className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => void moveItemTo(item.id, target)}
          className="flex-1 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          移动
        </button>
      </div>
    </Modal>
  );
}

export function MoveDialogHost() {
  const moveItemId = useStore((state) => state.moveItemId);
  if (!moveItemId) return null;
  return <MoveDialog key={moveItemId} itemId={moveItemId} />;
}
