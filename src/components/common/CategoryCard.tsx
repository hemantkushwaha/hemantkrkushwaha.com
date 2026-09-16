import { FolderGit2 } from 'lucide-react';
import { Card } from './Card';
import { CategoryItem } from '../../config/categories';

interface CategoryCardProps {
  key?: string;
  category: CategoryItem;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article
      id={`cat-${category.id}`}
      className="h-full flex flex-col"
    >
      <Card className="h-full flex flex-col justify-between hover:border-stone-400 transition-colors p-6 sm:p-7">
        <div className="space-y-4">
          {/* Header with Title and Format */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="font-mono text-[11px] text-stone-400 tracking-wider">
                {category.targetUrl}
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-stone-950">
                {category.title}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0">
              <FolderGit2 className="w-4 h-4 text-stone-500" aria-hidden="true" />
            </div>
          </div>

          {/* Scope description */}
          <p className="text-sm text-stone-600 leading-relaxed">
            {category.scopeDescription}
          </p>

          {/* Format Specifier */}
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-stone-100/90 text-stone-700 border border-stone-200/70 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
              {category.plannedFormat}
            </span>
          </div>
        </div>

        {/* Empty state / structural preparation footer */}
        <div className="pt-5 mt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="font-medium text-stone-400">
            Structure Ready
          </span>
          <span className="text-stone-400 italic">
            Content pending
          </span>
        </div>
      </Card>
    </article>
  );
}
