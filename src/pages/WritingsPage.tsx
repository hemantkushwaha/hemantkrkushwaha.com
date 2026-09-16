import { writingsConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { SectionContentFeed } from '../components/content/SectionContentFeed';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { Feather } from 'lucide-react';

export function WritingsPage() {
  usePageMetadata({
    title: 'Writings | Hemant Kumar Kushwaha',
    description:
      'Literary collections, poetry, novels, short stories, essays, and book archives by Hemant Kumar Kushwaha.',
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
