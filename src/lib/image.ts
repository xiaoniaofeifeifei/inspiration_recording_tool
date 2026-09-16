export interface TargetSize {
  width: number;
  height: number;
}

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

export const DEFAULT_MAX_EDGE = 1600;
export const DEFAULT_QUALITY = 0.8;

export function computeTargetSize(width: number, height: number, maxEdge: number): TargetSize {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function compressImage(
  file: File,
  options: { maxEdge?: number; quality?: number } = {},
): Promise<CompressedImage> {
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;

  try {
    const bitmap = await createImageBitmap(file);
    const target = computeTargetSize(bitmap.width, bitmap.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器不支持 canvas 2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, target.width, target.height);
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) throw new Error('图片压缩失败');

    return { blob, width: target.width, height: target.height, mimeType: 'image/jpeg' };
  } catch {
    return { blob: file, width: 0, height: 0, mimeType: file.type || 'image/jpeg' };
  }
}
