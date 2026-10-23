import { WritingBookItem } from '../../types/writingBook';
import { Card } from '../common/Card';
import { Link } from '../../router/RouterContext';
import {
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ArrowRight,
  Globe,
  Tag as TagIcon,
} from 'lucide-react';

interface WritingBookCardProps {
  book: WritingBookItem;
}

export function WritingBookCard({ book }: WritingBookCardProps) {
  const isHindi = book.language === 'Hindi';

  return (
    <article
      id={`writing-book-${book.id}`}
      className="h-full flex flex-col group"
      aria-labelledby={`heading-${book.id}`}
    >
      <Card
        className="h-full flex flex-col justify-between p-6 sm:p-7 bg-white border-stone-200 hover:border-stone-400 hover:shadow-xs transition-all duration-200"
      >
        <div className="space-y-5">
          {/* Top Classification Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-stone-600">
              <span className="font-semibold text-stone-900">{book.publisher}</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span className="text-stone-700">{book.format}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200/80">
                {book.language}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                <span>{book.status}</span>
              </span>
            </div>
          </div>

          {/* Book Representation Grid: Typographic Cover & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-1">
            {/* Typographic Book Spine / Cover Mockup */}
            <div className="sm:col-span-4 flex sm:block justify-center">
              {book.coverImage ? (
                <div className="w-36 sm:w-full aspect-[2/3] rounded-md overflow-hidden border border-stone-300 shadow-2xs">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div
                  className="w-36 sm:w-full aspect-[2/3] rounded-md border p-3.5 flex flex-col justify-between shadow-2xs transition-transform duration-200 group-hover:-translate-y-0.5 bg-gradient-to-br from-stone-900 to-stone-850 text-stone-100 border-stone-950"
                  aria-hidden="true"
                >
                  {/* Book Header on Cover */}
                  <div className="space-y-1">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-stone-400">
                      {book.publisher}
                    </span>
                    <div className="w-6 h-0.5 bg-amber-400" />
                  </div>

                  {/* Cover Typographic Title */}
                  <div className="my-auto py-2">
                    <p
                      className={`font-serif text-xs font-semibold leading-snug line-clamp-4 ${
                        isHindi ? 'font-medium text-stone-100' : 'text-stone-100'
                      }`}
                    >
                      {book.title}
                    </p>
                    {book.subtitle && (
                      <p className="font-mono text-[9px] text-stone-400 mt-1 line-clamp-2">
                        {book.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Cover Author & Format Footer */}
                  <div className="pt-2 border-t border-stone-800 text-[9px] font-mono flex items-center justify-between text-stone-400">
                    <span className="truncate">H. K. Kushwaha</span>
                    <span>{book.format.includes('Kindle') ? 'Kindle' : 'Print'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Book Details */}
            <div className="sm:col-span-8 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 font-mono">
                  <span>Author:</span>
                  <span className="font-medium text-stone-900">{book.author}</span>
                </div>

                <h3
                  id={`heading-${book.id}`}
                  className="font-serif text-lg sm:text-xl font-medium text-stone-950 leading-snug group-hover:text-stone-800 transition-colors"
                >
                  {book.title}
                </h3>

                {book.subtitle && (
                  <p className="font-serif italic text-xs sm:text-sm text-stone-600">
                    {book.subtitle}
                  </p>
                )}

                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-3 pt-1">
                  {book.description}
                </p>
              </div>

              {/* Identifiers: ASIN or ISBN */}
              <div className="pt-2 border-t border-stone-100 space-y-1 text-xs font-mono text-stone-500">
                {book.asin && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-400">ASIN:</span>
                    <span className="font-semibold text-stone-800">{book.asin}</span>
                    <span className="text-[10px] text-stone-400">({book.format})</span>
                  </div>
                )}
                {book.isbn10 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-400">ISBN-10:</span>
                    <span className="font-semibold text-stone-800">{book.isbn10}</span>
                  </div>
                )}
                {book.isbn13 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-400">ISBN-13:</span>
                    <span className="font-medium text-stone-700">{book.isbn13}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-stone-400">Genre:</span>
                  <span className="text-stone-700">{book.genre}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer: Direct Verified External Link & Internal Synopsis Link */}
        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <Link
            href={`/content/${book.slug}`}
            className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 transition-colors font-mono py-1 self-start sm:self-auto"
          >
            <span>Read Details &amp; Synopsis</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>

          <a
            id={`btn-amazon-${book.id}`}
            href={book.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-stone-50 font-medium hover:bg-stone-800 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-stone-900"
            title={book.verifiedDestinationDescription}
          >
            <span>{book.urlLabel}</span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-300" aria-hidden="true" />
          </a>
        </div>
      </Card>
    </article>
  );
}
