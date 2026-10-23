import { AcademicBookItem } from '../../types/academicBook';
import { Card } from '../common/Card';
import { BookOpen, ExternalLink, Bookmark, CheckCircle2 } from 'lucide-react';

interface AcademicBookCardProps {
  book: AcademicBookItem;
  key?: string;
}

export function AcademicBookCard({ book }: AcademicBookCardProps) {
  return (
    <article
      id={`book-${book.id}`}
      className="h-full flex flex-col group"
      aria-labelledby={`heading-${book.id}`}
    >
      <Card
        className={`h-full flex flex-col justify-between p-6 sm:p-7 transition-all duration-200 ${
          book.isResearchProminent
            ? 'bg-stone-50/80 border-stone-300/90 shadow-2xs hover:border-stone-500'
            : 'bg-white border-stone-200 hover:border-stone-400'
        }`}
      >
        <div className="space-y-5">
          {/* Top Classification & Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-stone-600">
              {book.year && <span className="font-semibold text-stone-900">{book.year}</span>}
              {book.year && <span className="text-stone-300" aria-hidden="true">&bull;</span>}
              <span className="text-stone-700 font-medium">{book.publisher}</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                  book.isResearchProminent
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-700 border border-stone-200/80'
                }`}
              >
                {book.bookType}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                <span>{book.status}</span>
              </span>
            </div>
          </div>

          {/* Book Representation: Typographic Cover & Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-1">
            {/* Typographic Book Spine / Cover Mockup (Does not pretend to be scanned jacket) */}
            <div className="sm:col-span-4 flex sm:block justify-center">
              <div
                className={`w-36 sm:w-full aspect-[2/3] rounded-md border p-3.5 flex flex-col justify-between shadow-2xs transition-transform duration-200 group-hover:-translate-y-0.5 ${
                  book.isResearchProminent
                    ? 'bg-gradient-to-br from-stone-900 to-stone-850 text-stone-100 border-stone-950'
                    : 'bg-gradient-to-br from-stone-100 to-stone-200/80 text-stone-900 border-stone-300'
                }`}
                aria-hidden="true"
              >
                {/* Book Header on Cover */}
                <div className="space-y-1">
                  <span
                    className={`block font-mono text-[9px] uppercase tracking-wider ${
                      book.isResearchProminent ? 'text-stone-400' : 'text-stone-500'
                    }`}
                  >
                    {book.publisher}
                  </span>
                  <div
                    className={`w-6 h-0.5 ${
                      book.isResearchProminent ? 'bg-amber-400' : 'bg-stone-700'
                    }`}
                  />
                </div>

                {/* Cover Typographic Title */}
                <div className="my-auto py-2">
                  <p
                    className={`font-serif text-xs font-semibold leading-snug line-clamp-4 ${
                      book.isResearchProminent ? 'text-stone-100' : 'text-stone-950'
                    }`}
                  >
                    {book.title}
                  </p>
                </div>

                {/* Cover Author & Year Footer */}
                <div
                  className={`pt-2 border-t text-[9px] font-mono flex items-center justify-between ${
                    book.isResearchProminent
                      ? 'border-stone-800 text-stone-400'
                      : 'border-stone-300 text-stone-600'
                  }`}
                >
                  <span className="truncate">H. K. Kushwaha</span>
                  <span>{book.year || 'Ed.'}</span>
                </div>
              </div>
            </div>

            {/* Book Metadata & Description */}
            <div className="sm:col-span-8 space-y-3">
              <h3
                id={`heading-${book.id}`}
                className="font-serif text-lg sm:text-xl font-medium text-stone-950 leading-snug group-hover:text-stone-800 transition-colors"
              >
                {book.title}
              </h3>

              <p className="text-xs text-stone-600 font-sans">
                <span className="font-medium text-stone-900">Author: </span>
                {book.author}
              </p>

              {book.isbn13 && (
                <div className="text-[11px] font-mono text-stone-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>ISBN-13: {book.isbn13}</span>
                  {book.pages && (
                    <>
                      <span className="text-stone-300" aria-hidden="true">&bull;</span>
                      <span>{book.pages}</span>
                    </>
                  )}
                </div>
              )}

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
                {book.scopeDescription}
              </p>

              {book.keyTopics && book.keyTopics.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5" aria-label={`Topics for ${book.title}`}>
                  {book.keyTopics.map((topic) => (
                    <span
                      key={topic}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200/60"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Link Footer: Mandatory Direct Book URL */}
        <div className="pt-4 mt-6 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-stone-500 font-mono">
            Verified destination: {book.verifiedDestinationDescription}
          </span>

          <a
            id={`link-view-book-${book.id}`}
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition-colors shadow-2xs self-start sm:self-auto shrink-0 focus-visible:outline-2 focus-visible:outline-stone-900"
            aria-label={`${book.urlLabel} for ${book.title} (opens in new tab)`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{book.urlLabel}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </Card>
    </article>
  );
}
