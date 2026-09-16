import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { DraftAttachment } from '../store/useStore';
import { useRecorder } from '../lib/useRecorder';
import { compressImage } from '../lib/image';
import { newId } from '../lib/id';
import { formatDuration } from '../lib/format';
import { RecorderButton } from '../components/RecorderButton';
import { CameraIcon, ImageIcon, SparkleIcon } from '../components/icons';

export function HomePage() {
  const startDraft = useStore((state) => state.startDraft);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [readingImages, setReadingImages] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const recorder = useRecorder((result) => {
    startDraft({ attachments: [{ meta: result.meta, blob: result.blob }] });
  });

  const recording = recorder.status === 'recording';

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed || recording) return;
    setText('');
    startDraft({ text: trimmed });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setNotice(null);
    setReadingImages(true);
    const attachments: DraftAttachment[] = [];
    try {
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file);
        attachments.push({
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
    } catch {
      setNotice('这张图片读取失败了，换一张试试。');
    } finally {
      setReadingImages(false);
    }
    if (attachments.length > 0) startDraft({ attachments });
  };

  const message = recorder.error
    ? recorder.error
    : recorder.status === 'starting'
      ? '正在准备麦克风…'
      : recording
        ? `正在录音 ${formatDuration(recorder.elapsedMs)} · 点一下停止`
        : '点一下开始录音';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col items-center justify-center px-5 py-8 lg:min-h-screen">
      <div className="mb-2 flex items-center gap-2 lg:hidden">
        <SparkleIcon className="h-5 w-5 text-brand-600" />
        <span className="font-semibold text-slate-900">闪记</span>
      </div>
      <p className="mb-6 text-center text-sm text-slate-500">
        想到什么就先记下来，归类以后再说
      </p>

      <RecorderButton
        status={recorder.status}
        level={recorder.level}
        onStart={() => void recorder.start()}
        onStop={recorder.stop}
      />

      <p className="mt-4 h-5 text-sm text-slate-500">{message}</p>

      {notice ? (
        <div className="mt-4 w-full rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
          {notice}
        </div>
      ) : null}

      <div className="mt-8 w-full space-y-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !(event.nativeEvent as unknown as { isComposing?: boolean }).isComposing
            ) {
              event.preventDefault();
              submitText();
            }
          }}
          rows={2}
          disabled={recording}
          placeholder="也可以直接打字，回车即存"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={recording || readingImages}
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-brand-200 disabled:opacity-50"
          >
            <CameraIcon className="h-4 w-4" />
            拍照
          </button>
          <button
            type="button"
            disabled={recording || readingImages}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-brand-200 disabled:opacity-50"
          >
            <ImageIcon className="h-4 w-4" />
            {readingImages ? '处理中…' : '相册'}
          </button>
          <button
            type="button"
            disabled={recording || !text.trim()}
            onClick={submitText}
            className="ml-auto rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            存起来
          </button>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        记完先不用管它 —— 默认存到「新灵感」，之后随时移动
      </p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files);
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
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
