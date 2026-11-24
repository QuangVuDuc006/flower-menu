import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Flower2,
  Info,
  Loader2,
  SearchX,
  X,
} from 'lucide-react';
import type { FlowerProduct } from '../../types/flower';
import { formatVND } from '../../utils/format';

/**
 * Bespoke minimal botanical emblem for "Tiệm Hoa"
 */
export function BotanicalEmblem({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="17" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
      <path
        d="M18 28.5C18 22.5 18.4 16.2 21.5 10.8"
        stroke="#355E4B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18.3 22.5C14.6 21.8 12.2 19.2 12.4 15.8C15.7 16.1 18.1 18.4 18.3 22.5Z"
        fill="#839B87"
        fillOpacity="0.35"
        stroke="#355E4B"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M19.3 17.8C22.8 17.2 25.1 14.9 25 11.7C21.8 11.9 19.6 14 19.3 17.8Z"
        fill="#839B87"
        fillOpacity="0.3"
        stroke="#355E4B"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="22.1" cy="9.4" r="2.4" fill="#DCA5AD" stroke="#355E4B" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * Clean recognizable Zalo chat icon
 */
export function ZaloIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3C6.75 3 2.5 6.69 2.5 11.25C2.5 13.86 3.89 16.19 6.08 17.71L5.22 20.82C5.11 21.21 5.51 21.54 5.86 21.35L9.38 19.44C10.22 19.64 11.1 19.75 12 19.75C17.25 19.75 21.5 16.06 21.5 11.5C21.5 6.94 17.25 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.75H11.75L8.5 13.5H11.75M14.25 9.75V13.5H16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'rose';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]';

  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-forest text-ivory hover:bg-forest-hover shadow-[0_1px_2px_rgba(48,54,49,0.12)] border border-forest',
    secondary:
      'bg-cream text-charcoal hover:bg-cream-hover border border-line',
    outline:
      'bg-paper text-charcoal border border-line-strong hover:border-sage hover:bg-cream/60',
    ghost:
      'bg-transparent text-stone hover:text-charcoal hover:bg-cream/75 border border-transparent',
    rose:
      'bg-rose-soft text-charcoal border border-rose/60 hover:bg-rose/25',
  };

  const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[40px] px-3.5 py-2 text-sm',
    md: 'min-h-[44px] px-4 py-2.5 text-[15px]',
    lg: 'min-h-[48px] px-6 py-3 text-base',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}

export interface CategoryChipProps {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

export function CategoryChip({ label, active, count, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap inline-flex items-center gap-2 border shrink-0 ${
        active
          ? 'bg-forest text-ivory border-forest shadow-[0_2px_8px_rgba(53,94,75,0.18)]'
          : 'bg-paper text-charcoal border-line hover:border-sage hover:bg-cream/65'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
            active ? 'bg-ivory/20 text-ivory' : 'bg-cream text-stone'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function StatusBadge({ isVisible }: { isVisible: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
        isVisible
          ? 'bg-forest-soft text-forest border-forest/20'
          : 'bg-cream text-stone border-line-strong'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isVisible ? 'bg-forest' : 'bg-muted'
        }`}
        aria-hidden="true"
      />
      {isVisible ? 'Đang hiển thị' : 'Đang ẩn'}
    </span>
  );
}

export interface FlowerImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  forceLoading?: boolean;
  priority?: boolean;
}

export function FlowerImage({
  src,
  alt,
  className = 'aspect-[4/5]',
  imgClassName = '',
  forceLoading = false,
  priority = false,
}: FlowerImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setErrored(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  const showSkeleton = forceLoading || (!loaded && !errored);

  return (
    <div className={`relative overflow-hidden bg-cream ${className}`}>
      {showSkeleton && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-cream via-ivory to-cream animate-pulse flex items-center justify-center"
          aria-hidden="true"
        >
          <Flower2 className="w-6 h-6 text-sage/45" />
        </div>
      )}
      {errored ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-cream text-stone">
          <Flower2 className="w-8 h-8 text-sage mb-2" />
          <span className="text-xs">Ảnh mẫu hoa</span>
        </div>
      ) : (
        !forceLoading && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`w-full h-full object-cover transition-all duration-500 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${imgClassName}`}
          />
        )
      )}
    </div>
  );
}

export interface ProductCardProps {
  product: FlowerProduct;
  onSelect: (product: FlowerProduct) => void;
  priority?: boolean;
}

export function ProductCard({ product, onSelect, priority }: ProductCardProps) {
  return (
    <article className="group flex flex-col">
      <button
        type="button"
        data-product-code={product.code}
        onClick={() => onSelect(product)}
        className="w-full text-left flex flex-col rounded-2xl bg-paper border border-line/85 p-2 sm:p-2.5 transition-all duration-200 hover:border-sage/75 hover:shadow-[0_10px_28px_-12px_rgba(48,54,49,0.14)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-forest"
        aria-label={`Xem mẫu hoa ${product.name}, mã ${product.code}, giá ${formatVND(product.price)}`}
      >
        <div className="relative rounded-xl overflow-hidden w-full">
          <FlowerImage
            src={product.images[0]}
            alt={`${product.name} — ${product.code}`}
            className="aspect-[4/5] w-full"
            imgClassName="group-hover:scale-[1.035]"
            priority={priority}
          />
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-ivory/92 backdrop-blur-[2px] border border-line/80 text-[11px] font-medium tracking-wider text-charcoal tabular-nums">
            {product.code}
          </span>
          {product.isFeatured && (
            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-rose-soft/95 backdrop-blur-[2px] border border-rose/50 text-[11px] font-semibold tracking-wide text-rose-deep shadow-xs">
              Nổi bật
            </span>
          )}
        </div>

        <div className="pt-2.5 pb-1 px-1 flex flex-col gap-1">
          <span className="text-[11px] sm:text-xs text-stone truncate">
            {product.primaryCategory}
          </span>
          <h3 className="text-[15px] sm:text-[16.5px] font-medium text-charcoal leading-snug break-words">
            {product.name}
          </h3>
          <div className="pt-0.5 flex items-center justify-between gap-2">
            <span className="text-[15px] sm:text-[16px] font-semibold text-forest tabular-nums">
              {formatVND(product.price)}
            </span>
            <span
              className="hidden sm:inline-flex items-center gap-0.5 text-xs font-medium text-stone opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
              aria-hidden="true"
            >
              Chi tiết
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      className="rounded-2xl bg-paper border border-line/80 p-2 sm:p-2.5 flex flex-col"
      aria-hidden="true"
    >
      <div className="aspect-[4/5] w-full rounded-xl bg-cream animate-pulse flex items-center justify-center">
        <Flower2 className="w-6 h-6 text-sage/35" />
      </div>
      <div className="pt-3 pb-1.5 px-1 space-y-2">
        <div className="h-3 w-16 rounded bg-cream animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-cream animate-pulse" />
        <div className="h-4 w-24 rounded bg-cream animate-pulse" />
      </div>
    </div>
  );
}

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  helperText?: string;
  leadingIcon?: React.ReactNode;
  trailingElement?: React.ReactNode;
}

export function InputField({
  label,
  hint,
  error,
  helperText,
  leadingIcon,
  trailingElement,
  id,
  className = '',
  ...props
}: InputFieldProps) {
  const inputId = id || `field-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-charcoal">
          {label}
        </label>
        {hint && <span className="text-xs text-stone">{hint}</span>}
      </div>
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-3.5 text-stone pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
          className={`w-full min-h-[46px] rounded-xl bg-paper border px-3.5 py-2.5 text-[15px] text-charcoal placeholder:text-muted transition-colors ${
            leadingIcon ? 'pl-10' : ''
          } ${trailingElement ? 'pr-12' : ''} ${
            error
              ? 'border-danger bg-danger-soft/35 focus:border-danger'
              : 'border-line-strong hover:border-sage focus:border-forest'
          } focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/20 read-only:bg-cream/70 read-only:text-stone ${className}`}
          {...props}
        />
        {trailingElement && (
          <div className="absolute right-2.5 flex items-center">{trailingElement}</div>
        )}
      </div>
      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs text-danger flex items-center gap-1.5 pt-0.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={`${inputId}-help`} className="text-xs text-stone">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  helperText?: string;
}

export function TextareaField({
  label,
  hint,
  error,
  helperText,
  id,
  className = '',
  ...props
}: TextareaFieldProps) {
  const inputId = id || `textarea-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-charcoal">
          {label}
        </label>
        {hint && <span className="text-xs text-stone">{hint}</span>}
      </div>
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl bg-paper border px-3.5 py-3 text-[15px] text-charcoal placeholder:text-muted transition-colors leading-relaxed ${
          error
            ? 'border-danger bg-danger-soft/35'
            : 'border-line-strong hover:border-sage focus:border-forest'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/20 ${className}`}
        {...props}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger flex items-center gap-1.5 pt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-stone">{helperText}</p>
      ) : null}
    </div>
  );
}

export function FeedbackBanner({
  variant = 'info',
  title,
  message,
  onDismiss,
}: {
  variant?: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    success: 'bg-forest-soft border-forest/25 text-charcoal',
    error: 'bg-danger-soft border-danger/30 text-charcoal',
    info: 'bg-cream border-line-strong text-charcoal',
  }[variant];

  const icon = {
    success: <CheckCircle2 className="w-5 h-5 text-forest shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-forest shrink-0 mt-0.5" />,
  }[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-3 ${styles}`}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="text-sm leading-relaxed">
          {title && <p className="font-semibold text-charcoal">{title}</p>}
          <p className={title ? 'text-stone mt-0.5' : 'text-charcoal'}>{message}</p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          className="min-w-[36px] min-h-[36px] -my-1 -mr-1 rounded-lg inline-flex items-center justify-center text-stone hover:text-charcoal hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'search',
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'search' | 'flower';
}) {
  return (
    <div className="rounded-2xl bg-paper border border-line px-6 py-12 sm:py-16 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-cream border border-line mx-auto flex items-center justify-center text-forest mb-4">
        {icon === 'search' ? (
          <SearchX className="w-5 h-5" />
        ) : (
          <Flower2 className="w-5 h-5" />
        )}
      </div>
      <h3 className="font-serif text-2xl font-semibold text-charcoal">{title}</h3>
      <p className="text-sm sm:text-[15.5px] text-stone mt-2 leading-relaxed max-w-md mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function DialogModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      if (!panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panelRef.current.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === panelRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (openerRef.current && openerRef.current.isConnected) {
        openerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-md rounded-2xl bg-paper border border-line p-5 sm:p-6 shadow-[0_20px_50px_rgba(48,54,49,0.2)] focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
          <h2
            id={headingId}
            className="font-serif text-2xl font-semibold text-charcoal leading-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="min-w-[40px] min-h-[40px] -mt-1 -mr-1 rounded-xl inline-flex items-center justify-center text-stone hover:text-charcoal hover:bg-cream transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  visible,
}: {
  message: string | null;
  visible: boolean;
}) {
  if (!visible || !message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-4 py-3 rounded-full bg-charcoal text-ivory text-sm font-medium shadow-[0_12px_30px_rgba(48,54,49,0.28)] inline-flex items-center gap-2.5"
    >
      <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
}
