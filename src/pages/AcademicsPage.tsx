import { academicsConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { SectionContentFeed } from '../components/content/SectionContentFeed';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { GraduationCap } from 'lucide-react';

export function AcademicsPage() {
  usePageMetadata({
    title: 'Academics | Hemant Kumar Kushwaha',
    description:
      'Academic frameworks, courses, curricula, presentations, study materials, and instructional notes by Hemant Kumar Kushwaha.',
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
