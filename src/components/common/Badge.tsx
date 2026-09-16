import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'neutral' | 'accent' | 'subtle';
  className?: string;
  id?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  className = '',
  id,
}: BadgeProps) {
  const variantClasses = {
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    accent: 'bg-stone-900 text-stone-100 border-stone-800',
    subtle: 'bg-white text-stone-600 border-stone-200 shadow-2xs',
  };

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
