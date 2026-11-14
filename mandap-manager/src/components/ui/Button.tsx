import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600',
  secondary: 'bg-gradient-to-r from-violet-100 to-indigo-100 text-indigo-900 hover:from-violet-200 hover:to-indigo-200 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-indigo-100 dark:hover:from-violet-900/60 dark:hover:to-indigo-900/60',
  danger: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm shadow-rose-600/20 hover:from-rose-700 hover:to-red-700',
  ghost: 'bg-transparent text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30',
  outline: 'border border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-900/30',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed max-sm:min-h-11',
        loading && 'relative isolate overflow-hidden',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="button-shimmer pointer-events-none absolute inset-0 z-0"
        />
      )}
      {loading && (
        <span className="relative z-10 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      <span className="relative z-10 inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}
