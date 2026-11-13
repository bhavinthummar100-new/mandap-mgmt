import { useCallback, useEffect, useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/lib/i18n';
import { firstImageFile, listenForPastedImage, photoErrorKey, processPhotoFile } from '@/utils/photo';

interface PhotoPickerProps {
  value?: string;
  altText?: string;
  onFileChange: (file: File | null) => void;
  onRemoveChange: (removed: boolean) => void;
}

export function PhotoPicker({ value, altText, onFileChange, onRemoveChange }: PhotoPickerProps) {
  const [previewUrl, setPreviewUrl] = useState(value ?? '');
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onFileChange, onRemoveChange });
  const { t } = useTranslation();

  useEffect(() => {
    callbacksRef.current = { onFileChange, onRemoveChange };
  }, [onFileChange, onRemoveChange]);

  useEffect(() => {
    if (!objectUrlRef.current) setPreviewUrl(value ?? '');
  }, [value]);

  const processFile = useCallback(async (file: File) => {
    setError('');
    setProcessing(true);
    try {
      const processed = await processPhotoFile(file);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const preview = URL.createObjectURL(processed);
      objectUrlRef.current = preview;
      setPreviewUrl(preview);
      callbacksRef.current.onFileChange(processed);
      callbacksRef.current.onRemoveChange(false);
    } catch (reason) {
      setError(t(photoErrorKey(reason instanceof Error ? reason.message : 'photoProcessingFailed')));
    } finally {
      setProcessing(false);
    }
  }, [t]);

  useEffect(() => {
    const removeListener = listenForPastedImage(
      document,
      (file) => void processFile(file),
      (reason) => setError(t(photoErrorKey(reason.message)))
    );
    return () => {
      removeListener();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [processFile, t]);

  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) throw new Error('clipboard-unavailable');
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type === 'image/png' || type === 'image/jpeg');
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        await processFile(new File([blob], `pasted-photo.${imageType === 'image/png' ? 'png' : 'jpg'}`, { type: imageType }));
        return;
      }
      setError(t('photoPasteFallback'));
    } catch {
      setError(t('photoPasteFallback'));
      toast.error(t('photoPasteFallback'));
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = firstImageFile(event.dataTransfer.files);
    if (!file) {
      setError(t('photoImageOnly'));
      return;
    }
    void processFile(file);
  };

  const removePhoto = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPreviewUrl('');
    onFileChange(null);
    onRemoveChange(true);
    setError('');
  };

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void processFile(file);
          event.target.value = '';
        }}
      />
      {previewUrl ? (
        <img src={previewUrl} alt={altText ?? t('customerPhoto')} className="mx-auto h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700">
          <ImagePlus className="h-9 w-9" />
        </div>
      )}
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{t('photoPickerHint')}</p>
      {processing && <p className="mt-2 text-sm text-blue-600">{t('processingPhoto')}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={processing} onClick={() => inputRef.current?.click()}>
          {t('uploadPhoto')}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={processing} onClick={() => void pasteFromClipboard()}>
          <ClipboardPaste className="h-4 w-4" /> {t('pastePhoto')}
        </Button>
        {previewUrl && (
          <>
            <Button type="button" size="sm" variant="outline" disabled={processing} onClick={() => inputRef.current?.click()}>
              {t('changePhoto')}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={processing} onClick={removePhoto}>
              <Trash2 className="h-4 w-4" /> {t('removePhoto')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
