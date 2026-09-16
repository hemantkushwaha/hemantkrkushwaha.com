import { researchConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { Microscope, Info } from 'lucide-react';

export function ResearchPage() {
  usePageMetadata({
    title: 'Research | Hemant Kumar Kushwaha',
    description:
      'Empirical inquiries, publications, patent archives, PhD research, experiments, and datasets by Hemant Kumar Kushwaha.',
  });

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      <SectionHeader
        sectionTitle={researchConfig.title}
        subtitle={researchConfig.subtitle}
        tagline={researchConfig.tagline}
        introDescription={researchConfig.introDescription}
      />

      <Container size="xl">
        <section aria-labelledby="research-categories-heading" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h2
                id="research-categories-heading"
                className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
              >
                Inquiry Pillars &amp; Scholarly Records
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Structural navigation categories for scientific investigations, patent filings, and primary datasets.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
              <Microscope className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
              7 Planned Pillars
            </span>
          </div>

          {/* Grid of Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {researchConfig.categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>

          {/* Structural Empty State Notice */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-100/50 p-6 flex items-start gap-4">
            <Info className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-stone-900">
                Scholarly Bibliography &amp; Patent Index in Preparation
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Peer-reviewed paper citations, patent documentation, and experimental protocols are currently being cataloged. No simulated citations or artificial research metrics are displayed.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
