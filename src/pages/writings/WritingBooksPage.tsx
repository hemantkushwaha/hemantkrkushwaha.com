import { useState } from 'react';
import { Container } from '../../components/common/Container';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { Link } from '../../router/RouterContext';
import { publishedWritingBooks } from '../../data/writingBooksData';
import { WritingBookCard } from '../../components/writings/WritingBookCard';
import {
  Bookmark,
  Sparkles,
  BookOpen,
  Filter,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export function WritingBooksPage() {
  usePageMetadata({
    title: 'Published Books & Literary Works | Hemant Kumar Kushwaha',
    description:
      'Authored novels, poetry collections, and published creative volumes by Hemant Kumar Kushwaha available on Amazon Kindle and in paperback print.',
  });

  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'Hindi' | 'English'>('all');
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'Kindle' | 'Paperback'>('all');

  const filteredBooks = publishedWritingBooks.filter((book) => {
    if (selectedLanguage !== 'all' && book.language !== selectedLanguage) {
      return false;
    }
    if (selectedFormat !== 'all') {
      if (selectedFormat === 'Kindle' && !book.format.includes('Kindle')) return false;
      if (selectedFormat === 'Paperback' && !book.format.includes('Paperback')) return false;
    }
    return true;
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      {/* Breadcrumbs */}
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
              <Link href="/writings" className="hover:text-stone-900 transition-colors">
                Writings
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-300">/</li>
            <li className="font-semibold text-stone-900" aria-current="page">
              Published Books
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
                3 Published Volumes
              </span>
              <span className="text-xs text-stone-500 font-mono">
                Amazon KDP &bull; Notion Press &bull; Hindi &amp; English
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950">
              Published Books &amp; Creative Works
            </h1>

            <p className="font-serif italic text-base sm:text-lg text-stone-700 leading-relaxed">
              Original literary works authored by Hemant Kumar Kushwaha across romantic poetry, ghazals, and contemporary fiction drama. Verified Amazon product listings and print editions.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-stone-600 border-t border-stone-200/80 pt-3">
              <span>Author: Hemant Kumar Kushwaha</span>
              <span className="text-stone-300">&bull;</span>
              <span>Kindle eBooks &amp; Paperback</span>
              <span className="text-stone-300">&bull;</span>
              <span className="text-emerald-700 font-medium">All Direct Links Verified</span>
            </div>
          </div>
        </Container>
      </header>

      {/* Filter Toolbar & Books Grid */}
      <Container size="xl">
        <div className="space-y-8">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
            <div className="flex items-center gap-2 text-xs font-mono text-stone-600">
              <Filter className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
              <span>Filter by Language:</span>
              <div className="flex flex-wrap gap-1">
                {(['all', 'Hindi', 'English'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                      selectedLanguage === lang
                        ? 'bg-stone-900 text-stone-50'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {lang === 'all' ? 'All Languages' : lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-stone-600">
              <span>Format:</span>
              <div className="flex flex-wrap gap-1">
                {(['all', 'Kindle', 'Paperback'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                      selectedFormat === fmt
                        ? 'bg-stone-900 text-stone-50'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {fmt === 'all' ? 'All Formats' : fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <WritingBookCard key={book.id} book={book} />
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-12 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 text-sm">
              No books matched the selected filters.
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
