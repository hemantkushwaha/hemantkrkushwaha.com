import { writingsConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { SectionContentFeed } from '../components/content/SectionContentFeed';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { publishedWritingBooks } from '../data/writingBooksData';
import { WritingBookCard } from '../components/writings/WritingBookCard';
import { Link } from '../router/RouterContext';
import { Feather, Bookmark, Sparkles, ArrowRight } from 'lucide-react';

export function WritingsPage() {
  usePageMetadata({
    title: 'Writings | Hemant Kumar Kushwaha',
    description:
      'Literary collections, poetry, novels, short stories, essays, and published books by Hemant Kumar Kushwaha.',
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      <SectionHeader
        sectionTitle={writingsConfig.title}
        subtitle={writingsConfig.subtitle}
        tagline={writingsConfig.tagline}
        introDescription={writingsConfig.introDescription}
      />

      <Container size="xl">
        <div className="space-y-16">
          {/* Featured Published Books Section (3 Published Books) */}
          <section
            id="published-books"
            aria-labelledby="published-books-heading"
            className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xs space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-stone-900 text-stone-50">
                    <Sparkles className="w-3 h-3 text-amber-300" aria-hidden="true" />
                    3 Published Books
                  </span>
                  <span className="text-xs text-stone-500 font-mono">
                    Amazon KDP &bull; Notion Press
                  </span>
                </div>
                <h2
                  id="published-books-heading"
                  className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
                >
                  Published Books &amp; Literary Works
                </h2>
                <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
                  Published fiction novels, romantic poetry anthologies, and expressive literature authored by Hemant Kumar Kushwaha. Verified direct links to Amazon Kindle eBooks and paperback editions.
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  id="btn-view-all-writing-books"
                  href="/writings/books"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900"
                >
                  <Bookmark className="w-4 h-4" aria-hidden="true" />
                  <span>Dedicated Books Catalog</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Grid of 3 Published Books */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedWritingBooks.map((book) => (
                <WritingBookCard key={book.id} book={book} />
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500 border-t border-stone-100">
              <p>
                All three book listings verified with authentic ASIN / ISBN identifiers and direct Amazon product destinations.
              </p>
              <Link
                href="/writings/books"
                className="font-medium text-stone-900 hover:underline inline-flex items-center gap-1"
              >
                Go to Dedicated Books Catalog &rarr;
              </Link>
            </div>
          </section>

          {/* Real Content Database Feed */}
          <SectionContentFeed
            section="writings"
            sectionTitle="Literary Works &amp; Essays"
            id="writings-content-feed"
          />

          {/* Literary Forms & Creative Works */}
          <section aria-labelledby="writings-categories-heading" className="space-y-8 pt-8 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h2
                  id="writings-categories-heading"
                  className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
                >
                  Literary Forms &amp; Creative Works
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  Structural navigation categories for poetry collections, prose manuscripts, and literary volumes.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
                <Feather className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
                6 Literary Forms
              </span>
            </div>

            {/* Intro Context Banner */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8 space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-medium text-stone-900">
                About This Archive
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                This literary wing hosts original creative writing across multiple genres, including metric and free-verse poetry, serialized fiction, short narratives, reflective prose, and complete book publications.
              </p>
            </div>

            {/* Grid of Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {writingsConfig.categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
