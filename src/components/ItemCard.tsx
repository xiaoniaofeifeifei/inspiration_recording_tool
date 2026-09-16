import { Link } from 'react-router-dom';
import type { Item } from '../types';
import { INBOX_ID } from '../types';
import { useBlobUrl } from '../lib/hooks';
import { describeTarget } from '../lib/labels';
import { formatDuration, formatRelativeTime } from '../lib/format';
import { useStore } from '../store/useStore';
import { ImageIcon, MusicIcon } from './icons';

function Thumbnail({ blobId }: { blobId: string }) {
  const url = useBlobUrl(blobId);
  if (!url) return <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-slate-100" />;
  return <img src={url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />;
}

export function ItemCard({ item, showLocation = false }: { item: Item; showLocation?: boolean }) {
  const notebooks = useStore((state) => state.notebooks);
  const sections = useStore((state) => state.sections);

  const audioAttachments = item.attachments.filter((attachment) => attachment.kind === 'audio');
  const imageAttachments = item.attachments.filter((attachment) => attachment.kind === 'image');
  const audioMs = audioAttachments.reduce(
    (total, attachment) => total + (attachment.durationMs ?? 0),
    0,
  );

  const firstLine = item.text.split('\n').find((line) => line.trim().length > 0)?.trim() ?? '';
  const fallback = audioAttachments.length > 0 ? '一段录音' : imageAttachments.length > 0 ? '一张图片' : '未命名灵感';
  const heading = item.title || firstLine || fallback;
  const preview = item.title ? item.text.trim() : item.text.split('\n').slice(1).join(' ').trim();

  const location = showLocation
    ? describeTarget({ notebookId: item.notebookId, sectionId: item.sectionId }, notebooks, sections)
    : null;

  return (
    <Link
      to={`/item/${item.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"
    >
      <div className="flex gap-3">
        {imageAttachments.length > 0 ? <Thumbnail blobId={imageAttachments[0].id} /> : null}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-slate-900">{heading}</h3>
          {preview ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{preview}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{formatRelativeTime(item.updatedAt)}</span>
            {audioAttachments.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <MusicIcon className="h-3.5 w-3.5" />
                {audioAttachments.length} 段 · {formatDuration(audioMs)}
              </span>
            ) : null}
            {imageAttachments.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                {imageAttachments.length} 张
              </span>
            ) : null}
            {showLocation ? (
              item.sectionId === INBOX_ID ? (
                <span className="text-amber-600">待归类</span>
              ) : (
                <span className="truncate">{location}</span>
              )
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
