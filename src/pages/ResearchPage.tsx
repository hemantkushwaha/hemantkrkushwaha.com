import { researchConfig } from '../config/categories';
import { SectionHeader } from '../components/common/SectionHeader';
import { CategoryCard } from '../components/common/CategoryCard';
import { Container } from '../components/common/Container';
import { SectionContentFeed } from '../components/content/SectionContentFeed';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { publicationRecords } from '../data/publicationData';
import { Link } from '../router/RouterContext';
import { Microscope, BookOpen, ArrowRight, FileText, ExternalLink, Sparkles } from 'lucide-react';

export function ResearchPage() {
  usePageMetadata({
    title: 'Research | Hemant Kumar Kushwaha',
    description:
      'Empirical inquiries, publications, patent archives, PhD research, experiments, and datasets by Hemant Kumar Kushwaha.',
  });

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      <SectionHeader
        sectionTitle={researchConfig.title}
        subtitle={researchConfig.subtitle}
        tagline={researchConfig.tagline}
        introDescription={researchConfig.introDescription}
      />

      <Container size="xl">
        <div className="space-y-16">
          {/* Featured Scholarly Publications Section (All 5 Papers) */}
          <section
            aria-labelledby="featured-publications-heading"
            className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xs space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-stone-900 text-stone-50">
                    <Sparkles className="w-3 h-3 text-amber-300" aria-hidden="true" />
                    Exact 5 Papers Cataloged
                  </span>
                  <span className="text-xs text-stone-500 font-mono">
                    2014 &ndash; 2026
                  </span>
                </div>
                <h2
                  id="featured-publications-heading"
                  className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
                >
                  Published Research Papers
                </h2>
                <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
                  Peer-reviewed journal articles and scholarly publications authored by Hemant Kumar Kushwaha across AI architectures, distributed systems, memory optimization, and social networks.
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  id="btn-view-all-publications"
                  href="/research/publications"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-stone-900"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  <span>Explore All 5 Publications</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* List of 5 Published Papers */}
            <div className="space-y-4">
              {publicationRecords.map((paper, index) => (
                <article
                  key={paper.id}
                  className="group relative rounded-xl border border-stone-200/90 bg-stone-50/50 p-5 sm:p-6 transition-all hover:bg-white hover:border-stone-400 hover:shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-stone-500">
                          #{index + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-stone-200/80 text-stone-800 font-mono font-medium">
                          {paper.year}
                        </span>
                        <span className="text-stone-400">•</span>
                        <span className="font-serif italic text-stone-700">
                          {paper.journalOrConference}
                        </span>
                        {paper.volume && (
                          <span className="text-stone-500 font-mono">
                            Vol. {paper.volume}{paper.issue ? `, Iss. ${paper.issue}` : ''}
                          </span>
                        )}
                        {paper.doi && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                            DOI: {paper.doi}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-950 group-hover:text-stone-800 transition-colors">
                        <Link
                          href="/research/publications"
                          className="hover:underline focus-visible:outline-2 focus-visible:outline-stone-900"
                        >
                          {paper.title}
                        </Link>
                      </h3>

                      <p className="text-xs sm:text-sm text-stone-600">
                        <span className="font-medium text-stone-900">Authors: </span>
                        {paper.authors.join(', ')}
                      </p>

                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed pt-1">
                        {paper.abstract}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between gap-2 pt-2 sm:pt-0">
                      {paper.pdfUrl && (
                        <a
                          href={paper.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-stone-700 bg-stone-200/70 hover:bg-stone-300 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
                          <span>PDF</span>
                        </a>
                      )}
                      <Link
                        href="/research/publications"
                        className="inline-flex items-center gap-1 text-xs font-medium text-stone-900 hover:text-stone-700 transition-colors"
                      >
                        <span>View Details &amp; Citation</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500 border-t border-stone-100">
              <p>
                All 5 publications feature full abstracts, search filtering, and one-click APA and BibTeX citation generators.
              </p>
              <Link
                href="/research/publications"
                className="font-medium text-stone-900 hover:underline inline-flex items-center gap-1"
              >
                Go to Dedicated Publications Page &rarr;
              </Link>
            </div>
          </section>

          {/* Database Content Feed (Dynamic additions) */}
          <SectionContentFeed
            section="research"
            sectionTitle="Additional Research Articles"
            id="research-content-feed"
          />

          {/* Inquiry Pillars & Scholarly Records */}
          <section aria-labelledby="research-categories-heading" className="space-y-8 pt-8 border-t border-stone-200">
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
          </section>
        </div>
      </Container>
    </div>
  );
}
