import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttachmentMeta } from '../types';
import { newId } from './id';
import { describeMicrophoneError, pickAudioMimeType } from './audio';

export interface RecordingResult {
  meta: AttachmentMeta;
  blob: Blob;
}

export type RecorderStatus = 'idle' | 'starting' | 'recording';

export function useRecorder(onFinish: (result: RecordingResult) => void) {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const teardown = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (status !== 'idle') return;
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('这个浏览器不支持录音，可以先打字或拍照记录。');
      return;
    }

    setStatus('starting');
    discardRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const chunks = chunksRef.current;
        const finalType = recorder.mimeType || mimeType || 'audio/webm';
        const durationMs = Date.now() - startedAtRef.current;
        const discarded = discardRef.current;
        chunksRef.current = [];
        teardown();
        setStatus('idle');
        setElapsedMs(0);
        if (discarded) return;
        const blob = new Blob(chunks, { type: finalType });
        onFinishRef.current({
          meta: {
            id: newId('att'),
            kind: 'audio',
            mimeType: finalType,
            size: blob.size,
            durationMs,
            createdAt: Date.now(),
          },
          blob,
        });
      };

      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (AudioContextCtor) {
        const context = new AudioContextCtor();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let index = 0; index < data.length; index += 1) {
            const value = (data[index] - 128) / 128;
            sum += value * value;
          }
          const rms = Math.sqrt(sum / data.length);
          setLevel(Math.min(1, rms * 3.5));
          frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
      }

      startedAtRef.current = Date.now();
      recorder.start(250);
      setStatus('recording');
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
    } catch (caught) {
      teardown();
      setStatus('idle');
      setError(describeMicrophoneError(caught));
    }
  }, [status, teardown]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  useEffect(
    () => () => {
      discardRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      teardown();
    },
    [teardown],
  );

  return { status, elapsedMs, level, error, start, stop, setError };
}
