import { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  id?: string;
  interactive?: boolean;
}

export function Card({
  children,
  className = '',
  id,
  interactive = false,
  ...props
}: CardProps) {
  const interactiveStyles = interactive
    ? 'transition-all duration-200 hover:border-stone-400 hover:shadow-sm'
    : '';

  return (
    <div
      id={id}
      className={`rounded-xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
