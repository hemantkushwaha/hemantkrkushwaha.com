/**
 * Lectures Index Page
 * 
 * Route: /academics/lectures
 * Architecture: Step 26 — Live Academic Navigation Slice
 * 
 * Level 1: Academics → Lectures
 * Shows real subject card: "Computer Networks"
 * Clicking it opens: /academics/lectures/computer-networks
 */

import { GraduationCap, ArrowRight, BookOpen } from 'lucide-react';
import { Container } from '../../components/common/Container';
import { Card } from '../../components/common/Card';
import { AcademicBreadcrumbs } from '../../components/academics/AcademicBreadcrumbs';
import { buildAcademicBreadcrumbs, getAcademicSubjects } from '../../data/academicData';
import { Link } from '../../router/RouterContext';
import { usePageMetadata } from '../../hooks/usePageMetadata';

export function LecturesPage() {
  usePageMetadata({
    title: 'Lectures | Academics | Hemant Kumar Kushwaha',
    description:
      'Curated academic lectures, subject modules, and university course curricula by Hemant Kumar Kushwaha.',
  });

  const breadcrumbs = buildAcademicBreadcrumbs();
  const subjects = getAcademicSubjects();

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      {/* Header with Breadcrumb & Context */}
      <header className="border-b border-stone-200/80 bg-stone-100/40 py-10 sm:py-14">
        <Container size="xl">
          <div className="max-w-3xl space-y-4">
            <AcademicBreadcrumbs items={breadcrumbs} />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Academic Curriculum
              </span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span className="font-serif italic text-xs text-stone-600">
                &ldquo;Lectures &amp; Coursework&rdquo;
              </span>
            </div>

            <h1
              id="lectures-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950"
            >
              Lectures
            </h1>

            <p className="text-base text-stone-600 leading-relaxed pt-1 max-w-2xl">
              Classroom transcripts, instructional frameworks, syllabus units, and structured course modules prepared for university computer science and engineering coursework.
            </p>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <Container size="xl">
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h2 className="font-serif text-2xl font-medium text-stone-950">
                Subjects &amp; Curricula
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Select a course subject to explore its syllabus units, topic breakdowns, and instructional resources.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200 self-start sm:self-auto">
              <GraduationCap className="w-3.5 h-3.5 text-stone-600" aria-hidden="true" />
              {subjects.length} Active Course
            </span>
          </div>

          {/* Subject Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => {
              const subjectUrl = `/academics/lectures/${subject.slug}`;
              const unitCount = subject.units.length;

              return (
                <article
                  key={subject.id}
                  id={`subject-card-${subject.slug}`}
                  className="h-full flex flex-col"
                >
                  <Card className="h-full flex flex-col justify-between hover:border-stone-400 transition-colors p-6 sm:p-7">
                    <div className="space-y-4">
                      {/* Course Code & Metadata */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          {subject.code && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200/80">
                              {subject.code}
                            </span>
                          )}
                          <h3 className="font-serif text-2xl font-medium text-stone-950 pt-2">
                            <Link
                              href={subjectUrl}
                              className="hover:text-stone-700 transition-colors"
                            >
                              {subject.title}
                            </Link>
                          </h3>
                        </div>
                        <div className="p-2.5 rounded-lg bg-stone-100 text-stone-700 shrink-0">
                          <BookOpen className="w-5 h-5 text-stone-600" aria-hidden="true" />
                        </div>
                      </div>

                      {/* Subtitle / Topic preview */}
                      {subject.subtitle && (
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                          {subject.subtitle}
                        </p>
                      )}

                      {/* Subject Description */}
                      <p className="text-sm text-stone-600 leading-relaxed">
                        {subject.description}
                      </p>

                      {/* Units badge */}
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-stone-100 text-stone-700 border border-stone-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          {unitCount} {unitCount === 1 ? 'Unit' : 'Units'} (Transport Layer)
                        </span>
                      </div>
                    </div>

                    {/* Card Footer: Action Link */}
                    <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-xs text-stone-500">
                        Syllabus Available
                      </span>
                      <Link
                        id={`link-to-${subject.slug}`}
                        href={subjectUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-900 hover:text-stone-600 transition-colors"
                      >
                        <span>View Syllabus</span>
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
