import { academicsConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { GraduationCap, Info } from 'lucide-react';

export function AcademicsPage() {
  usePageMetadata({
    title: 'Academics | Hemant Kumar Kushwaha',
    description:
      'Academic frameworks, courses, curricula, presentations, study materials, and instructional notes by Hemant Kumar Kushwaha.',
  });

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      <SectionHeader
        sectionTitle={academicsConfig.title}
        subtitle={academicsConfig.subtitle}
        tagline={academicsConfig.tagline}
        introDescription={academicsConfig.introDescription}
      />

      <Container size="xl">
        <section aria-labelledby="academic-categories-heading" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h2
                id="academic-categories-heading"
                className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
              >
                Academic Divisions &amp; Resources
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

          {/* Structural Empty State Notice */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-100/50 p-6 flex items-start gap-4">
            <Info className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-stone-900">
                Curriculum Archive in Preparation
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Specific course syllabi, lecture transcripts, and study guides will be published in a subsequent phase. No synthetic course records or placeholder files are pre-loaded.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
