import { philosophyConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { SectionContentFeed } from '../components/content/SectionContentFeed';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { Compass } from 'lucide-react';

export function PhilosophyPage() {
  usePageMetadata({
    title: 'Philosophy | Hemant Kumar Kushwaha',
    description:
      'Philosophical reflections, essays, and inquiries into consciousness, psychology, meditation, human nature, and society by Hemant Kumar Kushwaha.',
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      <SectionHeader
        sectionTitle={philosophyConfig.title}
        subtitle={philosophyConfig.subtitle}
        tagline={philosophyConfig.tagline}
        introDescription={philosophyConfig.introDescription}
      />

      <Container size="xl">
        <div className="space-y-16">
          {/* Real Content Database Feed */}
          <SectionContentFeed
            section="philosophy"
            sectionTitle="Philosophical Works"
            id="philosophy-content-feed"
          />

          {/* Philosophical Pillars & Inquiries */}
          <section aria-labelledby="philosophy-categories-heading" className="space-y-8 pt-8 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
              <div>
                <h2
                  id="philosophy-categories-heading"
                  className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
                >
                  Philosophical Pillars &amp; Inquiries
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  Structural thematic areas for philosophical essays, contemplative meditations, and analytical reflections.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
                <Compass className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
                8 Thematic Areas
              </span>
            </div>

            {/* Intro Context Banner */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8 space-y-3 shadow-2xs">
              <h3 className="font-serif text-lg font-medium text-stone-900">
                About This Section
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                This philosophical sanctuary serves as a dedicated intellectual space for long-form essays, dialectical inquiries, and contemplative writings. The content systematically examines foundational questions about self, consciousness, divinity, ethics, and human society.
              </p>
            </div>

            {/* Grid of Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {philosophyConfig.categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
