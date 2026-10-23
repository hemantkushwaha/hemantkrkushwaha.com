import { useState } from 'react';
import { Container } from '../../components/common/Container';
import { SectionHeader } from '../../components/common/SectionHeader';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { Link } from '../../router/RouterContext';
import { academicBooks } from '../../data/bookData';
import { AcademicBookCard } from '../../components/academics/AcademicBookCard';
import { BookClassification } from '../../types/academicBook';
import {
  Bookmark,
  BookOpen,
  Sparkles,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export function BooksPage() {
  usePageMetadata({
    title: 'Academic Books & Scholarly Monographs | Hemant Kumar Kushwaha',
    description:
      'Authored academic textbooks, theoretical treatises, and research monographs by Hemant Kumar Kushwaha covering Meta-Computing, Discrete Mathematics, and Algorithms.',
  });

  const [selectedFilter, setSelectedFilter] = useState<BookClassification | 'all'>('all');

  const filteredBooks = academicBooks.filter((book) => {
    if (selectedFilter === 'all') return true;
    return book.bookType === selectedFilter;
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumbs" className="border-b border-stone-200 bg-stone-50/60 py-3.5">
        <Container size="xl">
          <ol className="flex items-center gap-2 text-xs font-mono text-stone-600">
            <li>
              <Link href="/" className="hover:text-stone-900 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-300">/</li>
            <li>
              <Link href="/academics" className="hover:text-stone-900 transition-colors">
                Academics
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-300">/</li>
            <li className="font-semibold text-stone-900" aria-current="page">
              Academic Books
            </li>
          </ol>
        </Container>
      </nav>

      {/* Hero Section Header */}
      <header className="border-b border-stone-200/80 bg-stone-100/40 py-10 sm:py-14">
        <Container size="xl">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-stone-900 text-stone-50">
                <Sparkles className="w-3 h-3 text-amber-300" aria-hidden="true" />
                Exact 5 Authored Volumes
              </span>
              <span className="text-xs text-stone-500 font-mono">
                Eliva Press &bull; Amazon KDP
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950">
              Academic &amp; Scholarly Books
            </h1>

            <p className="font-serif italic text-base sm:text-lg text-stone-700 leading-relaxed">
              Authored academic textbooks, theoretical monographs, and technical guides designed for university curricula, distributed systems research, and conceptual computing foundations.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-stone-600 border-t border-stone-200/80 pt-3">
              <span>Author: Hemant Kumar Kushwaha</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>All 5 Books Published</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>Direct Verified Purchase &amp; Catalogue Links</span>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Books Container */}
      <Container size="xl">
        <div className="space-y-10">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-stone-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
              <Filter className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
              <span>Filter by Classification:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                All Books (5)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('Technical / Research Book')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedFilter === 'Technical / Research Book'
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Technical / Research (2)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('Technical / Academic Book')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedFilter === 'Technical / Academic Book'
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Technical / Academic (1)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('Technical Book')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedFilter === 'Technical Book'
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Technical Book (1)
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('Book')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedFilter === 'Book'
                    ? 'bg-stone-900 text-stone-50'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                General Guide (1)
              </button>
            </div>
          </div>

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredBooks.map((book) => (
              <AcademicBookCard key={book.id} book={book} />
            ))}
          </div>

          {/* Context Note / Academic Verification Invariant */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-6 space-y-2 text-xs text-stone-600">
            <h3 className="font-serif text-sm font-medium text-stone-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>Authentic Bibliographic Sourcing &amp; Link Invariants</span>
            </h3>
            <p className="leading-relaxed">
              Every book in this catalogue corresponds to an authentic authored title from the curriculum vitae of Hemant Kumar Kushwaha.
              Direct destination links open the official publisher catalogue (Eliva Press) or verified retail/library index listings (Google Books, Walmart, and Amazon KDP). No cover art or product records have been synthetically fabricated.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
