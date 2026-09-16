import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addAttachments,
  deleteItem,
  moveItem,
  removeAttachment,
  updateItem,
} from '../db';
import { compressImage } from '../lib/image';
import { newId } from '../lib/id';
import { formatDateTime } from '../lib/format';
import { useItem } from '../lib/hooks';
import { useRecorder } from '../lib/useRecorder';
import { describeTarget } from '../lib/labels';
import type { Target } from '../lib/labels';
import { useStore } from '../store/useStore';
import { ClassifyPicker } from '../components/ClassifyPicker';
import { Modal } from '../components/Modal';
import { PageShell } from '../components/PageShell';
import { StoredAttachment } from '../components/AttachmentView';
import { BackIcon, CameraIcon, ImageIcon, MicIcon, StopIcon } from '../components/icons';
import { INBOX_ID } from '../types';
import type { AttachmentMeta, Item } from '../types';

export function ItemPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const loaded = useItem(itemId);
  const notebooks = useStore((state) => state.notebooks);
  const sections = useStore((state) => state.sections);
  const refresh = useStore((state) => state.refresh);
  const bumpVersion = useStore((state) => state.bumpVersion);
  const showToast = useStore((state) => state.showToast);

  const [base, setBase] = useState<Item | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState<Target>({ notebookId: null, sectionId: INBOX_ID });
  const [busy, setBusy] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loaded) return;
    setBase(loaded);
    setTitle(loaded.title);
    setText(loaded.text);
  }, [loaded]);

  useEffect(() => {
    if (!base) return undefined;
    if (title === base.title && text === base.text) return undefined;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      void updateItem(base.id, { title, text }).then((updated) => {
        if (updated) setBase(updated);
        setSaveState('saved');
        bumpVersion();
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [title, text, base, bumpVersion]);

  const recorder = useRecorder((result) => {
    if (!base) return;
    setBusy(true);
    void addAttachments(base.id, [{ meta: result.meta, blob: result.blob }])
      .then((updated) => {
        if (updated) setBase(updated);
        bumpVersion();
      })
      .finally(() => setBusy(false));
  });

  const appendImages = async (files: FileList | null) => {
    if (!files || files.length === 0 || !base) return;
    setBusy(true);
    try {
      const additions: { meta: AttachmentMeta; blob: Blob }[] = [];
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        additions.push({
          meta: {
            id: newId('att'),
            kind: 'image',
            mimeType: compressed.mimeType,
            size: compressed.blob.size,
            width: compressed.width,
            height: compressed.height,
            createdAt: Date.now(),
          },
          blob: compressed.blob,
        });
      }
      const updated = await addAttachments(base.id, additions);
      if (updated) setBase(updated);
      bumpVersion();
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!base) return;
    const updated = await removeAttachment(base.id, attachmentId);
    if (updated) setBase(updated);
    bumpVersion();
  };

  const openMove = () => {
    if (!base) return;
    setTarget({ notebookId: base.notebookId, sectionId: base.sectionId });
    setMoving(true);
  };

  const confirmMove = async () => {
    if (!base) return;
    const updated = await moveItem(base.id, target);
    if (updated) setBase(updated);
    setMoving(false);
    await refresh();
    bumpVersion();
    showToast({ text: `已移动到 ${describeTarget(target, notebooks, sections)}` });
  };

  const handleDelete = async () => {
    if (!base) return;
    if (!window.confirm('删除这条灵感？里面的录音和图片会一起删掉，不能恢复。')) return;
    await deleteItem(base.id);
    bumpVersion();
    await refresh();
    showToast({ text: '已删除' });
    navigate('/library');
  };

  if (loaded === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-40 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (!base) {
    return (
      <PageShell title="找不到这条灵感" subtitle="它可能已经被删掉了。">
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

  const location = describeTarget(
    { notebookId: base.notebookId, sectionId: base.sectionId },
    notebooks,
    sections,
  );
  const recording = recorder.status === 'recording';

  return (
    <PageShell
      back={
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"
        >
          <BackIcon className="h-4 w-4" />
          返回
        </button>
      }
      title="这条灵感"
      subtitle={`${base.sectionId === INBOX_ID ? '待归类 · ' : ''}${location} · ${formatDateTime(
        base.createdAt,
      )}`}
      actions={
        <>
          <button
            type="button"
            onClick={openMove}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            移动
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-50"
          >
            删除
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="加个标题（可选）"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        {base.attachments.length > 0 ? (
          <div className="space-y-3">
            {base.attachments.map((attachment) => (
              <StoredAttachment
                key={attachment.id}
                attachment={attachment}
                onRemove={() => void handleRemoveAttachment(attachment.id)}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => (recording ? recorder.stop() : void recorder.start())}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm disabled:opacity-50 ${
              recording
                ? 'bg-brand-700 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-200'
            }`}
          >
            {recording ? <StopIcon className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
            {recording ? '停止并加入' : '继续录音'}
          </button>
          <button
            type="button"
            disabled={busy || recording}
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-brand-200 disabled:opacity-50"
          >
            <CameraIcon className="h-4 w-4" />
            拍照
          </button>
          <button
            type="button"
            disabled={busy || recording}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-brand-200 disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" />
            加图片
          </button>
          <span className="ml-auto text-xs text-slate-400">
            {saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已自动保存' : ''}
          </span>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="继续说点什么…"
          rows={8}
          className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <p className="text-xs text-slate-400">最后更新 {formatDateTime(base.updatedAt)}</p>
      </div>

      {moving ? (
        <Modal onClose={() => setMoving(false)} labelledBy="item-move-title">
          <h2 id="item-move-title" className="text-lg font-semibold text-slate-900">
            把这条灵感移到
          </h2>
          <div className="mt-4">
            <ClassifyPicker value={target} onChange={setTarget} />
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setMoving(false)}
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void confirmMove()}
              className="flex-1 rounded-2xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              移动
            </button>
          </div>
        </Modal>
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void appendImages(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void appendImages(event.target.files);
          event.target.value = '';
        }}
      />
    </PageShell>
  );
}
