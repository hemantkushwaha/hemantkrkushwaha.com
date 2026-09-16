import { ContentItem } from '../../types/content';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Sparkles, Calendar, Tag as TagIcon, ArrowRight } from 'lucide-react';

interface ContentCardProps {
  item: ContentItem;
  id?: string;
}

/**
 * Format raw content_type into human-readable label
 */
function formatContentType(type: string): string {
  if (!type) return '';
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format ISO published_at date string into human-readable date
 */
function formatPublishedDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

export function ContentCard({ item, id }: ContentCardProps) {
  const formattedType = formatContentType(item.content_type);
  const formattedDate = formatPublishedDate(item.published_at);

  return (
    <Card
      id={id || `content-card-${item.slug}`}
      interactive={true}
      className="flex flex-col justify-between h-full group transition-all duration-200 hover:border-stone-400 hover:shadow-md"
    >
      <div className="space-y-3">
        {/* Top Badges: Category, Content Type, Featured */}
        <div className="flex flex-wrap items-center gap-2">
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600" aria-hidden="true" />
              Featured
            </span>
          )}

          {item.category && item.category.trim() !== '' && (
            <Badge variant="subtle" className="text-stone-700">
              <TagIcon className="w-3 h-3 text-stone-500 mr-1" aria-hidden="true" />
              {item.category}
            </Badge>
          )}

          {formattedType && (
            <span className="text-xs font-mono uppercase tracking-wider text-stone-500 px-2 py-0.5 bg-stone-100 rounded">
              {formattedType}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-950 group-hover:text-stone-800 transition-colors line-clamp-2">
          {item.title}
        </h3>

        {/* Description (Only render if present) */}
        {item.description && item.description.trim() !== '' && (
          <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}
      </div>

      {/* Card Footer: Published Date & Preparation for future detail pages */}
      <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
        {formattedDate ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-stone-500">
            <Calendar className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
            {formattedDate}
          </span>
        ) : (
          <span />
        )}

        <span className="inline-flex items-center gap-1 font-medium text-stone-700 group-hover:text-stone-950 transition-colors">
          <span>Read</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
