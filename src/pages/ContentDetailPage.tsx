import { useEffect, useState } from 'react';
import { getContentBySlug } from '../services/contentService';
import { ContentItem, SectionId } from '../types/content';
import { Container } from '../components/common/Container';
import { Badge } from '../components/common/Badge';
import { Link } from '../router/RouterContext';
import { usePageMetadata } from '../hooks/usePageMetadata';
import {
  Calendar,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  Download,
  Tag as TagIcon,
  Compass,
  AlertCircle,
  RefreshCw,
  FolderTree,
  BookOpen,
  GraduationCap,
  Microscope,
  Feather,
} from 'lucide-react';

interface ContentDetailPageProps {
  slug: string;
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Section metadata mapping for breadcrumbs and navigation
 */
const SECTION_INFO: Record<
  SectionId,
  { name: string; path: string; icon: typeof Compass }
> = {
  academics: {
    name: 'Academics',
    path: '/academics',
    icon: GraduationCap,
  },
  research: {
    name: 'Research',
    path: '/research',
    icon: Microscope,
  },
  philosophy: {
    name: 'Philosophy',
    path: '/philosophy',
    icon: Compass,
  },
  writings: {
    name: 'Writings',
    path: '/writings',
    icon: Feather,
  },
};

export function ContentDetailPage({ slug }: ContentDetailPageProps) {
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchItem = async (targetSlug: string) => {
    setLoading(true);
    setHasError(false);
    try {
      const item = await getContentBySlug(targetSlug);
      setContent(item);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setHasError(false);
      try {
        const item = await getContentBySlug(slug);
        if (isMounted) {
          setContent(item);
        }
      } catch {
        if (isMounted) {
          setHasError(true);
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
  }, [slug]);

  // Page title and SEO metadata update
  const pageTitle = content
    ? `${content.title} — Hemant Kumar Kushwaha`
    : loading
    ? 'Loading Publication… — Hemant Kumar Kushwaha'
    : 'Content Not Found — Hemant Kumar Kushwaha';

  const pageDescription =
    content?.description ||
    'Official academic resources, research publications, philosophical treatises, and literary works by Hemant Kumar Kushwaha.';

  usePageMetadata({
    title: pageTitle,
    description: pageDescription,
  });

  // 1. LOADING STATE
  if (loading) {
    return (
      <div id="content-detail-loading" className="py-12 sm:py-16">
        <Container size="md">
          <div className="space-y-8 animate-pulse" aria-live="polite" aria-busy="true">
            {/* Back link placeholder */}
            <div className="h-4 w-32 bg-stone-200 rounded" />

            {/* Badges placeholder */}
            <div className="flex gap-2">
              <div className="h-5 w-24 bg-stone-200 rounded-full" />
              <div className="h-5 w-20 bg-stone-200 rounded-full" />
            </div>

            {/* Title placeholder */}
            <div className="space-y-3">
              <div className="h-10 w-4/5 bg-stone-200 rounded-lg" />
              <div className="h-10 w-2/3 bg-stone-200 rounded-lg" />
            </div>

            {/* Metadata bar placeholder */}
            <div className="h-4 w-48 bg-stone-200 rounded" />

            {/* Body placeholder */}
            <div className="space-y-4 pt-6 border-t border-stone-200">
              <div className="h-4 w-full bg-stone-200 rounded" />
              <div className="h-4 w-full bg-stone-200 rounded" />
              <div className="h-4 w-5/6 bg-stone-200 rounded" />
              <div className="h-4 w-4/5 bg-stone-200 rounded" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 2. ERROR STATE (Graceful, zero leak of internals)
  if (hasError) {
    return (
      <div id="content-detail-error" className="py-16 sm:py-24">
        <Container size="sm">
          <div className="text-center space-y-5 rounded-2xl border border-stone-200 bg-white p-8 sm:p-12 shadow-2xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
              <AlertCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
              Unable to Load Publication
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
              An unexpected network interruption occurred while loading this resource. Please try again or return to the main sections.
            </p>
            <div className="pt-3 flex flex-wrap justify-center items-center gap-3">
              <button
                onClick={() => fetchItem(slug)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Retry</span>
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-800 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 3. NOT FOUND STATE (When slug does not exist or item is not public/published)
  if (!content) {
    return (
      <div id="content-detail-not-found" className="py-16 sm:py-24">
        <Container size="sm">
          <div className="text-center space-y-6 rounded-2xl border border-stone-200 bg-white p-8 sm:p-12 shadow-2xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
              <BookOpen className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                Content Not Found
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                The requested publication or resource does not exist, has been archived, or is not publicly available.
              </p>
            </div>

            {/* Navigation links back to sections */}
            <div className="pt-4 border-t border-stone-100 flex flex-wrap justify-center gap-2 text-xs">
              <Link
                href="/academics"
                className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors"
              >
                Academics
              </Link>
              <Link
                href="/research"
                className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors"
              >
                Research
              </Link>
              <Link
                href="/philosophy"
                className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors"
              >
                Philosophy
              </Link>
              <Link
                href="/writings"
                className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors"
              >
                Writings
              </Link>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 4. CONTENT DETAIL VIEW
  const sectionMeta = SECTION_INFO[content.section] || {
    name: content.section,
    path: `/${content.section}`,
    icon: Compass,
  };
  const SectionIcon = sectionMeta.icon;
  const formattedType = formatContentType(content.content_type);
  const formattedDate = formatPublishedDate(content.published_at);

  // Safely split text body into paragraphs
  const bodyParagraphs = content.body
    ? content.body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  return (
    <article id={`content-detail-${content.slug}`} className="py-10 sm:py-16 space-y-12">
      <Container size="md">
        {/* Navigation Breadcrumb / Back Link */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <Link
            href={sectionMeta.path}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-600 hover:text-stone-950 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            <span>Back to {sectionMeta.name}</span>
          </Link>
        </nav>

        {/* Header Block */}
        <header className="space-y-6">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Featured Badge */}
            {content.is_featured && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                Featured
              </span>
            )}

            {/* Section Badge */}
            <Link
              href={sectionMeta.path}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-800 hover:bg-stone-200 transition-colors border border-stone-200"
            >
              <SectionIcon className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
              <span>{sectionMeta.name}</span>
            </Link>

            {/* Category */}
            {content.category && content.category.trim() !== '' && (
              <Badge variant="subtle" className="text-stone-700">
                <TagIcon className="w-3 h-3 text-stone-500 mr-1" aria-hidden="true" />
                {content.category}
              </Badge>
            )}

            {/* Subcategory (Only when available) */}
            {content.subcategory && content.subcategory.trim() !== '' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-stone-100 text-stone-600 border border-stone-200">
                <FolderTree className="w-3 h-3 text-stone-400" aria-hidden="true" />
                {content.subcategory}
              </span>
            )}

            {/* Content Type */}
            {formattedType && (
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500 px-2.5 py-1 bg-stone-100 rounded">
                {formattedType}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950 leading-tight">
            {content.title}
          </h1>

          {/* Meta Info: Published Date */}
          {formattedDate && (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-stone-500">
              <Calendar className="w-4 h-4 text-stone-400" aria-hidden="true" />
              <span>Published on {formattedDate}</span>
            </div>
          )}

          {/* Description (Only when available) */}
          {content.description && content.description.trim() !== '' && (
            <p className="text-lg sm:text-xl text-stone-700 font-serif leading-relaxed italic border-l-2 border-stone-300 pl-4 py-1">
              {content.description}
            </p>
          )}
        </header>

        {/* Thumbnail Image (Only when available) */}
        {content.thumbnail_url && content.thumbnail_url.trim() !== '' && (
          <div className="my-8 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-2xs">
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full max-h-[460px] object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        )}

        {/* Safe Body Text Content (Only when available) */}
        {bodyParagraphs.length > 0 && (
          <div className="pt-8 my-8 border-t border-stone-200">
            <div className="space-y-6 text-base sm:text-lg text-stone-800 leading-relaxed font-serif">
              {bodyParagraphs.map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* External URL & File Links (Only when available) */}
        {(content.external_url || content.file_url) && (
          <div className="pt-8 my-8 border-t border-stone-200 space-y-4">
            <h2 className="font-serif text-lg font-medium text-stone-950">
              Resources &amp; Attachments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* External Resource URL */}
              {content.external_url && content.external_url.trim() !== '' && (
                <a
                  href={content.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/80 transition-colors group"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
                      External Resource
                    </span>
                    <p className="text-sm font-medium text-stone-900 line-clamp-1">
                      {content.external_url}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-stone-900 transition-colors shrink-0 ml-2" aria-hidden="true" />
                </a>
              )}

              {/* Downloadable / Accessible File Link */}
              {content.file_url && content.file_url.trim() !== '' && (
                <a
                  href={content.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/80 transition-colors group"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
                      Document / File Attachment
                    </span>
                    <p className="text-sm font-medium text-stone-900 line-clamp-1">
                      Download Attached Resource
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-stone-500 group-hover:text-stone-900 transition-colors shrink-0 ml-2" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-10 mt-12 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href={sectionMeta.path}
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-800 hover:text-stone-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>More in {sectionMeta.name}</span>
          </Link>

          <Link
            href="/"
            className="text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-stone-900 transition-colors"
          >
            Knowledge Archive Home
          </Link>
        </div>
      </Container>
    </article>
  );
}
