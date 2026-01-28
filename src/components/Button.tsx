import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Button as HeadlessButton } from '@headlessui/react';
import { LoadingSpinner } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-primary' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-indigo-600 text-white shadow-sm',
    'hover:bg-indigo-700',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:bg-indigo-600 disabled:opacity-70',
  ].join(' '),
  secondary: [
    'border border-gray-300 bg-white text-gray-700 shadow-sm',
    'hover:bg-gray-50',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  danger: [
    'bg-red-600 text-white shadow-sm',
    'hover:bg-red-700',
    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:bg-red-600 disabled:opacity-70',
  ].join(' '),
  ghost: [
    'text-gray-500',
    'hover:bg-gray-100 hover:text-gray-700',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  'ghost-primary': [
    'text-gray-400',
    'hover:bg-indigo-50',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  link: [
    'text-indigo-600 font-medium',
    'hover:text-indigo-700 hover:underline',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline',
  ].join(' '),
};

const textSizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
};

const paddingStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5',
  md: 'px-4 py-2',
  lg: 'px-6 py-3',
};

const ghostPaddingStyles: Record<ButtonSize, string> = {
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    fullWidth = false,
    disabled,
    className,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;
  const isGhostVariant = variant === 'ghost' || variant === 'ghost-primary';

  // Determine padding: ghost variants use minimal padding, link has none, others use standard
  const getPaddingClass = () => {
    if (variant === 'link') return '';
    if (isGhostVariant) return ghostPaddingStyles[size];
    return paddingStyles[size];
  };

  const baseClasses = [
    'inline-flex items-center justify-center rounded-md font-medium',
    variantStyles[variant],
    textSizeStyles[size],
    getPaddingClass(),
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <HeadlessButton
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading}
      className={baseClasses}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner className={loadingText ? 'h-4 w-4 mr-2' : 'h-4 w-4'} />
          {loadingText}
        </>
      ) : (
        children
      )}
    </HeadlessButton>
  );
});
