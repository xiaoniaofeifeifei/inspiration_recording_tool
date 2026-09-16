import type { AttachmentKind } from '../types';
import type { DraftAttachment } from '../store/useStore';
import type { AttachmentMeta } from '../types';
import { useBlobUrl, useObjectUrl } from '../lib/hooks';
import { formatDuration } from '../lib/format';
import { MusicIcon, XIcon } from './icons';

interface AttachmentViewProps {
  kind: AttachmentKind;
  url: string | null;
  durationMs?: number;
  onRemove?: () => void;
}

export function AttachmentView({ kind, url, durationMs, onRemove }: AttachmentViewProps) {
  if (!url) {
    return <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (kind === 'audio') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
          <MusicIcon className="h-4 w-4" />
          <span>录音{durationMs ? ` · ${formatDuration(durationMs)}` : ''}</span>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="ml-auto text-slate-400 hover:text-rose-500"
            >
              删除
            </button>
          ) : null}
        </div>
        <audio controls src={url} className="w-full" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200">
      <img src={url} alt="灵感图片" className="max-h-72 w-full object-cover" />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="删除图片"
          className="absolute top-2 right-2 rounded-full bg-slate-900/60 p-1.5 text-white hover:bg-slate-900/80"
        >
          <XIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function StoredAttachment({
  attachment,
  onRemove,
}: {
  attachment: AttachmentMeta;
  onRemove?: () => void;
}) {
  const url = useBlobUrl(attachment.id);
  return (
    <AttachmentView
      kind={attachment.kind}
      url={url}
      durationMs={attachment.durationMs}
      onRemove={onRemove}
    />
  );
}

export function DraftAttachmentView({
  attachment,
  onRemove,
}: {
  attachment: DraftAttachment;
  onRemove?: () => void;
}) {
  const url = useObjectUrl(attachment.blob);
  return (
    <AttachmentView
      kind={attachment.meta.kind}
      url={url}
      durationMs={attachment.meta.durationMs}
      onRemove={onRemove}
    />
  );
}
