import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  id,
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2 rounded-lg gap-2 min-h-[44px]',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 min-h-[48px]',
  };

  const variants = {
    primary: 'bg-stone-900 text-stone-50 hover:bg-stone-800 active:bg-stone-950',
    secondary:
      'bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 border border-stone-200/80',
    outline:
      'bg-transparent text-stone-800 border border-stone-300 hover:bg-stone-100 active:bg-stone-200',
    ghost:
      'bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200 hover:text-stone-900',
  };

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
