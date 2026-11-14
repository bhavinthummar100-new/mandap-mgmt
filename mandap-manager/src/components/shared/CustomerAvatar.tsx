import { useState } from 'react';
import { cn } from '@/utils/cn';

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
};

interface CustomerAvatarProps {
  name: string;
  photoUrl?: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function CustomerAvatar({ name, photoUrl, size = 'md', className }: CustomerAvatarProps) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-400 font-bold text-white ring-2 ring-white shadow-sm dark:ring-gray-800',
        sizes[size],
        className
      )}
    >
      {photoUrl && failedPhotoUrl !== photoUrl ? (
        <img
          src={photoUrl}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
          onError={() => setFailedPhotoUrl(photoUrl)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
