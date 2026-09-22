/**
 * Academic Breadcrumb Navigation Component
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 26 — Live Academic Navigation Slice
 */

import { ChevronRight } from 'lucide-react';
import { Link } from '../../router/RouterContext';
import { AcademicBreadcrumbItem } from '../../types/academicNavigation';

interface AcademicBreadcrumbsProps {
  items: AcademicBreadcrumbItem[];
  className?: string;
}

export function AcademicBreadcrumbs({ items, className = '' }: AcademicBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1.5 text-xs text-stone-500 ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1 || item.isCurrent;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight
                className="w-3.5 h-3.5 text-stone-400 shrink-0"
                aria-hidden="true"
              />
            )}
            {isLast || !item.href ? (
              <span
                className="font-medium text-stone-900"
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-stone-900 transition-colors py-0.5"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
