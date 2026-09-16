import { useEffect, useState } from 'react';
import { getContentBySection } from '../../services/contentService';
import { ContentItem, SectionId } from '../../types/content';
import { ContentCard } from './ContentCard';
import { FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface SectionContentFeedProps {
  section: SectionId;
  sectionTitle?: string;
  id?: string;
}

export function SectionContentFeed({
  section,
  sectionTitle,
  id,
}: SectionContentFeedProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchContent = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getContentBySection(section);
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await getContentBySection(section);
        if (isMounted) {
          setItems(data);
        }
      } catch {
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [section]);

  const containerId = id || `section-feed-${section}`;

  return (
    <div id={containerId} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
            {sectionTitle ? `Published ${sectionTitle}` : 'Published Works & Resources'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Official materials and verified publications from the unified content repository.
          </p>
        </div>

        {!loading && !error && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
            <FileText className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
            {items.length} {items.length === 1 ? 'Resource' : 'Resources'}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div
          id={`${containerId}-loading`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse"
          aria-live="polite"
          aria-busy="true"
        >
          {[1, 2, 3].map((placeholderIdx) => (
            <div
              key={placeholderIdx}
              className="rounded-xl border border-stone-200/60 bg-stone-50/80 p-6 sm:p-8 space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-stone-200 rounded-full" />
                <div className="h-4 w-16 bg-stone-200 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-stone-200 rounded" />
              <div className="space-y-2 pt-2">
                <div className="h-3.5 w-full bg-stone-200 rounded" />
                <div className="h-3.5 w-5/6 bg-stone-200 rounded" />
              </div>
              <div className="pt-4 border-t border-stone-200/60 flex justify-between items-center">
                <div className="h-3 w-24 bg-stone-200 rounded" />
                <div className="h-3 w-12 bg-stone-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          id={`${containerId}-error`}
          className="rounded-xl border border-stone-300 bg-stone-50 p-8 text-center space-y-3"
          role="alert"
        >
          <div className="w-10 h-10 rounded-full bg-stone-200/80 text-stone-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="font-serif text-lg font-medium text-stone-900">
            Unable to Load Content
          </h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            We are currently unable to retrieve resources for this section. Please try refreshing or check back shortly.
          </p>
          <div className="pt-2">
            <button
              onClick={fetchContent}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 hover:border-stone-400 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div
          id={`${containerId}-empty`}
          className="rounded-xl border border-stone-200 bg-white p-8 sm:p-12 text-center space-y-4 shadow-2xs"
        >
          <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 text-stone-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
              No published content yet.
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              New resources and writings will appear here soon.
            </p>
          </div>
        </div>
      )}

      {/* Populated Content Grid */}
      {!loading && !error && items.length > 0 && (
        <div
          id={`${containerId}-grid`}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
