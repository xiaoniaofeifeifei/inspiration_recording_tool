import type { RecorderStatus } from '../lib/useRecorder';
import { MicIcon, StopIcon } from './icons';

interface RecorderButtonProps {
  status: RecorderStatus;
  level: number;
  onStart: () => void;
  onStop: () => void;
}

export function RecorderButton({ status, level, onStart, onStop }: RecorderButtonProps) {
  const recording = status === 'recording';

  return (
    <div className="relative flex h-48 w-48 items-center justify-center">
      {recording ? (
        <>
          <span className="pulse-ring absolute h-32 w-32 rounded-full bg-brand-500/40" />
          <span
            className="absolute h-40 w-40 rounded-full bg-brand-100"
            style={{ transform: `scale(${1 + level * 0.15})` }}
          />
        </>
      ) : (
        <span className="absolute h-40 w-40 rounded-full bg-brand-50" />
      )}
      <button
        type="button"
        onClick={recording ? onStop : onStart}
        disabled={status === 'starting'}
        aria-label={recording ? '停止录音' : '开始录音'}
        className={`relative grid h-32 w-32 place-items-center rounded-full text-white shadow-xl transition disabled:opacity-60 ${
          recording
            ? 'bg-brand-700 shadow-brand-500/40'
            : 'bg-brand-600 shadow-brand-500/30 hover:bg-brand-700'
        }`}
      >
        {recording ? <StopIcon className="h-11 w-11" /> : <MicIcon className="h-14 w-14" />}
      </button>
    </div>
  );
}
