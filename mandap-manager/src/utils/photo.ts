export const MAX_SOURCE_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_PROCESSED_PHOTO_BYTES = 100 * 1024;
export type PhotoErrorKey =
  | 'photoImageOnly'
  | 'photoTooLarge'
  | 'photoProcessingFailed'
  | 'photoProcessedTooLarge';

export function photoErrorKey(message: string): PhotoErrorKey {
  switch (message) {
    case 'photoImageOnly':
    case 'photoTooLarge':
    case 'photoProcessedTooLarge':
      return message;
    default:
      return 'photoProcessingFailed';
  }
}

export function validatePhotoFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('photoImageOnly');
  }
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new Error('photoTooLarge');
  }
}

export function firstImageFile(files: ArrayLike<File>): File | null {
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (file?.type.startsWith('image/')) return file;
  }
  return null;
}

export function listenForPastedImage(
  target: EventTarget,
  onImage: (file: File) => void,
  onInvalid?: (error: Error) => void
): () => void {
  const listener = (event: Event) => {
    const pasteEvent = event as ClipboardEvent;
    const items = pasteEvent.clipboardData?.items;
    if (!items) return;

    let file: File | null = null;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item?.type.startsWith('image/')) continue;
      file = item.getAsFile();
      if (file) break;
    }

    if (!file) return;
    pasteEvent.preventDefault();
    try {
      validatePhotoFile(file);
      onImage(file);
    } catch (error) {
      onInvalid?.(error instanceof Error ? error : new Error('photoProcessingFailed'));
    }
  };

  target.addEventListener('paste', listener);
  return () => target.removeEventListener('paste', listener);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('photoProcessingFailed')),
      'image/jpeg',
      quality
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('photoProcessingFailed'));
    };
    image.src = url;
  });
}

export async function processPhotoFile(file: File): Promise<File> {
  validatePhotoFile(file);
  const image = await loadImage(file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  if (!sourceSize) throw new Error('photoProcessingFailed');

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('photoProcessingFailed');
  context.drawImage(
    image,
    (image.naturalWidth - sourceSize) / 2,
    (image.naturalHeight - sourceSize) / 2,
    sourceSize,
    sourceSize,
    0,
    0,
    400,
    400
  );

  for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const blob = await canvasToJpeg(canvas, quality);
    if (blob.size < MAX_PROCESSED_PHOTO_BYTES) {
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile';
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
    }
  }
  throw new Error('photoProcessedTooLarge');
}
