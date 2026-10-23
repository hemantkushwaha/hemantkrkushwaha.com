import { academicsConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { SectionContentFeed } from '../components/content/SectionContentFeed';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { academicBooks } from '../data/bookData';
import { AcademicBookCard } from '../components/academics/AcademicBookCard';
import { Link } from '../router/RouterContext';
import { GraduationCap, Bookmark, Sparkles, ArrowRight } from 'lucide-react';

export function AcademicsPage() {
  usePageMetadata({
    title: 'Academics | Hemant Kumar Kushwaha',
    description:
      'Academic frameworks, courses, curricula, presentations, study materials, and authored academic books by Hemant Kumar Kushwaha.',
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      <SectionHeader
        sectionTitle={academicsConfig.title}
        subtitle={academicsConfig.subtitle}
        tagline={academicsConfig.tagline}
        introDescription={academicsConfig.introDescription}
      />

      <Container size="xl">
        <div className="space-y-16">
          {/* Featured Academic Books Catalogue (All 5 Books) */}
          <section
            id="academic-books"
            aria-labelledby="academic-books-heading"
            className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xs space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-stone-900 text-stone-50">
                    <Sparkles className="w-3 h-3 text-amber-300" aria-hidden="true" />
                    Exact 5 Published Books
                  </span>
                  <span className="text-xs text-stone-500 font-mono">
                    2016 &ndash; 2026
                  </span>
                </div>
                <h2
                  id="academic-books-heading"
                  className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
                >
                  Academic Books &amp; Scholarly Monographs
                </h2>
                <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
                  Published academic volumes, theoretical monographs, and foundational programming texts authored by Hemant Kumar Kushwaha. Includes direct verified publisher and purchase links.
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  id="btn-view-all-books"
                  href="/academics/books"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900"
                >
                  <Bookmark className="w-4 h-4" aria-hidden="true" />
                  <span>Dedicated Books Page</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Grid of 5 Academic Books */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {academicBooks.map((book) => (
                <AcademicBookCard key={book.id} book={book} />
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500 border-t border-stone-100">
              <p>
                All five books are verified from author CV records. Each card provides direct destination links to official publisher pages or book listings.
              </p>
              <Link
                href="/academics/books"
                className="font-medium text-stone-900 hover:underline inline-flex items-center gap-1"
              >
                Go to Dedicated Books Catalog &rarr;
              </Link>
            </div>
          </section>

          {/* Real Content Database Feed */}
          <SectionContentFeed
            section="academics"
            sectionTitle="Academic Resources"
            id="academics-content-feed"
          />

          {/* Academic Divisions & Taxonomy */}
          <section aria-labelledby="academic-categories-heading" className="space-y-8 pt-8 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h2
                  id="academic-categories-heading"
                  className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
                >
                  Academic Divisions &amp; Curricula
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  Structural navigation categories for courses, lecture materials, and educational works.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
                <GraduationCap className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
                6 Planned Divisions
              </span>
            </div>

            {/* Grid of Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {academicsConfig.categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
