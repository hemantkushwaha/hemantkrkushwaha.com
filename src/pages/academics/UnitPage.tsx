/**
 * Academic Unit Page
 * 
 * Route: /academics/lectures/:subjectSlug/:unitSlug
 * Architecture: Step 26 — Live Academic Navigation Slice
 * 
 * Level 3: Transport Layer
 * Shows unit overview and topics structure with: "TCP"
 * TCP must be clickable.
 * Clicking it opens: /academics/lectures/computer-networks/transport-layer/tcp
 */

import { Network, ArrowRight, Compass, Layers } from 'lucide-react';
import { Container } from '../../components/common/Container';
import { Card } from '../../components/common/Card';
import { AcademicBreadcrumbs } from '../../components/academics/AcademicBreadcrumbs';
import {
  buildAcademicBreadcrumbs,
  getAcademicSubjectBySlug,
  getAcademicUnitBySlug,
} from '../../data/academicData';
import { Link } from '../../router/RouterContext';
import { usePageMetadata } from '../../hooks/usePageMetadata';

interface UnitPageProps {
  subjectSlug: string;
  unitSlug: string;
}

export function UnitPage({ subjectSlug, unitSlug }: UnitPageProps) {
  const subject = getAcademicSubjectBySlug(subjectSlug);
  const unit = getAcademicUnitBySlug(subjectSlug, unitSlug);

  usePageMetadata({
    title: unit && subject
      ? `${unit.title} | ${subject.title} | Academics | Hemant Kumar Kushwaha`
      : 'Unit Not Found | Academics',
    description:
      unit?.description ||
      'Syllabus unit and topic breakdowns for course lectures.',
  });

  if (!subject || !unit) {
    return (
      <section aria-label="Unit Not Found" className="py-20 sm:py-28">
        <Container size="sm">
          <div className="text-center space-y-5 rounded-2xl border border-stone-200 bg-white p-8 sm:p-12 shadow-2xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
              <Compass className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
              Unit Not Found
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              The requested academic unit could not be located.
            </p>
            <div className="pt-2">
              <Link
                href={subject ? `/academics/lectures/${subject.slug}` : '/academics/lectures'}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Return to {subject ? subject.title : 'Lectures'}
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  const breadcrumbs = buildAcademicBreadcrumbs(subject.slug, unit.slug);

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      {/* Header with Breadcrumb & Context */}
      <header className="border-b border-stone-200/80 bg-stone-100/40 py-10 sm:py-14">
        <Container size="xl">
          <div className="max-w-3xl space-y-4">
            <AcademicBreadcrumbs items={breadcrumbs} />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {unit.unitNumber && (
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-stone-200/70 text-stone-800 font-medium border border-stone-300/60">
                  Unit {unit.unitNumber}
                </span>
              )}
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
                {subject.title}
              </span>
            </div>

            <h1
              id="unit-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950"
            >
              {unit.title}
            </h1>

            {unit.subtitle && (
              <p className="font-serif italic text-base text-stone-600">
                &ldquo;{unit.subtitle}&rdquo;
              </p>
            )}

            <p className="text-base text-stone-600 leading-relaxed pt-1 max-w-2xl">
              {unit.description}
            </p>
          </div>
        </Container>
      </header>

      {/* Topics Breakdown */}
      <Container size="xl">
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h2 className="font-serif text-2xl font-medium text-stone-950">
                Unit Topics &amp; Protocols
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Select a topic to access study notes, presentations, interactive tools, and questions.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
              <Network className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
              {unit.topics.length} Topic
            </span>
          </div>

          {/* Topic Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {unit.topics.map((topic) => {
              const topicUrl = `/academics/lectures/${subject.slug}/${unit.slug}/${topic.slug}`;
              const resourceCount = topic.resources.length;

              return (
                <article
                  key={topic.id}
                  id={`topic-card-${topic.slug}`}
                  className="h-full flex flex-col"
                >
                  <Card className="h-full flex flex-col justify-between hover:border-stone-400 transition-colors p-6 sm:p-7">
                    <div className="space-y-4">
                      {/* Topic Title & Icon */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
                            Protocol / Concept
                          </span>
                          <h3 className="font-serif text-2xl font-medium text-stone-950">
                            <Link
                              id={`link-to-topic-${topic.slug}`}
                              href={topicUrl}
                              className="hover:text-stone-700 transition-colors"
                            >
                              {topic.title}
                            </Link>
                          </h3>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                          <Network className="w-5 h-5 text-stone-600" aria-hidden="true" />
                        </div>
                      </div>

                      {/* Subtitle */}
                      {topic.subtitle && (
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                          {topic.subtitle}
                        </p>
                      )}

                      {/* Description */}
                      <p className="text-sm text-stone-600 leading-relaxed">
                        {topic.description}
                      </p>

                      {/* Resources status summary */}
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-stone-100 text-stone-700 border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          {resourceCount} Resources Defined (Connection Pending)
                        </span>
                      </div>
                    </div>

                    {/* Topic Footer Link */}
                    <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-xs text-stone-500">
                        Resource Modules
                      </span>
                      <Link
                        href={topicUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-900 hover:text-stone-600 transition-colors"
                      >
                        <span>Access Topic</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </Card>
                </article>
              );
            })}
          </div>
        </div>
      </Container>
    </div>
  );
}
