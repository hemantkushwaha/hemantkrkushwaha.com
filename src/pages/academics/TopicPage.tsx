/**
 * Academic Topic Page
 * 
 * Route: /academics/lectures/:subjectSlug/:unitSlug/:topicSlug
 * Architecture: Step 26 — Live Academic Navigation Slice
 * 
 * Level 4: TCP (Transmission Control Protocol)
 * Shows:
 * - TCP title & conceptual description
 * - Exactly four resource cards:
 *   1. Study Material
 *   2. PPT
 *   3. Interactive App
 *   4. Question Bank
 * 
 * Invariants:
 * - Each card displays: "Resource not connected yet"
 * - ZERO fake URLs
 * - ZERO placeholder Google Drive links
 * - ZERO simulated content
 */

import { Network, Info, Compass } from 'lucide-react';
import { Container } from '../../components/common/Container';
import { AcademicBreadcrumbs } from '../../components/academics/AcademicBreadcrumbs';
import { ResourceCard } from '../../components/academics/ResourceCard';
import {
  buildAcademicBreadcrumbs,
  getAcademicSubjectBySlug,
  getAcademicUnitBySlug,
  getAcademicTopicBySlug,
} from '../../data/academicData';
import { Link } from '../../router/RouterContext';
import { usePageMetadata } from '../../hooks/usePageMetadata';

interface TopicPageProps {
  subjectSlug: string;
  unitSlug: string;
  topicSlug: string;
}

export function TopicPage({ subjectSlug, unitSlug, topicSlug }: TopicPageProps) {
  const subject = getAcademicSubjectBySlug(subjectSlug);
  const unit = getAcademicUnitBySlug(subjectSlug, unitSlug);
  const topic = getAcademicTopicBySlug(subjectSlug, unitSlug, topicSlug);

  usePageMetadata({
    title: topic && subject
      ? `${topic.title} (${topic.subtitle || ''}) | ${subject.title} | Academics | Hemant Kumar Kushwaha`
      : 'Topic Not Found | Academics',
    description:
      topic?.description ||
      'Academic topic overview and instructional syllabus resources.',
  });

  if (!subject || !unit || !topic) {
    return (
      <section aria-label="Topic Not Found" className="py-20 sm:py-28">
        <Container size="sm">
          <div className="text-center space-y-5 rounded-2xl border border-stone-200 bg-white p-8 sm:p-12 shadow-2xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
              <Compass className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
              Topic Not Found
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              The requested academic topic could not be found in this unit.
            </p>
            <div className="pt-2">
              <Link
                href={
                  subject && unit
                    ? `/academics/lectures/${subject.slug}/${unit.slug}`
                    : '/academics/lectures'
                }
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Return to {unit ? unit.title : 'Lectures'}
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  const breadcrumbs = buildAcademicBreadcrumbs(subject.slug, unit.slug, topic.slug);

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      {/* Header with Breadcrumb & Context */}
      <header className="border-b border-stone-200/80 bg-stone-100/40 py-10 sm:py-14">
        <Container size="xl">
          <div className="max-w-3xl space-y-4">
            <AcademicBreadcrumbs items={breadcrumbs} />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-stone-200/70 text-stone-800 font-medium border border-stone-300/60">
                {subject.title}
              </span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
                {unit.title}
              </span>
            </div>

            <h1
              id="topic-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950"
            >
              {topic.title}
            </h1>

            {topic.subtitle && (
              <p className="font-serif italic text-base text-stone-600">
                &ldquo;{topic.subtitle}&rdquo;
              </p>
            )}

            <p className="text-base text-stone-600 leading-relaxed pt-1 max-w-2xl">
              {topic.description}
            </p>
          </div>
        </Container>
      </header>

      {/* Resource Cards Section */}
      <Container size="xl">
        <div className="space-y-8">
          {/* Section Heading & Status Callout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h2 className="font-serif text-2xl font-medium text-stone-950">
                Topic Learning Resources
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Standard instructional resource categories defined for this syllabus topic.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
              <Network className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
              {topic.resources.length} Resource Categories
            </span>
          </div>

          {/* Transparent Status Notice Box */}
          <div
            id="resources-notice-callout"
            className="flex items-start gap-3 rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 sm:p-5 text-sm text-stone-700"
          >
            <Info className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium text-stone-900">
                Controlled Resource Connection Framework
              </p>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                The four standardized syllabus resources below (Study Material, PPT, Interactive App, Question Bank) have been structured as part of the live academic navigation slice. These resource modules are not connected to external assets yet; connections will be established through the verified ingestion pipeline in future steps.
              </p>
            </div>
          </div>

          {/* Exactly Four Resource Cards Grid */}
          <div
            id="resources-grid"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {topic.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
