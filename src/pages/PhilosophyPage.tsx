import { philosophyConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { Compass, Info } from 'lucide-react';

export function PhilosophyPage() {
  usePageMetadata({
    title: 'Philosophy | Hemant Kumar Kushwaha',
    description:
      'Philosophical reflections, essays, and inquiries into consciousness, psychology, meditation, human nature, and society by Hemant Kumar Kushwaha.',
  });

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      <SectionHeader
        sectionTitle={philosophyConfig.title}
        subtitle={philosophyConfig.subtitle}
        tagline={philosophyConfig.tagline}
        introDescription={philosophyConfig.introDescription}
      />

      <Container size="xl">
        <section aria-labelledby="philosophy-categories-heading" className="space-y-8">
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
              This philosophical sanctuary serves as a dedicated intellectual space for long-form essays, dialectical inquiries, and contemplative writings. The forthcoming content will systematically examine each of the eight thematic categories below, exploring foundational questions about self, consciousness, divinity, ethics, and human society.
            </p>
          </div>

          {/* Grid of Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {philosophyConfig.categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>

          {/* Structural Empty State Notice */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-100/50 p-6 flex items-start gap-4">
            <Info className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-stone-900">
                Essays and Reflections in Preparation
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Essays, aphorisms, and contemplative texts are being finalized for publication. No placeholder articles or synthetic texts are included.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
