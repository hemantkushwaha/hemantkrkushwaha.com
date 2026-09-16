import { ComponentType } from 'react';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { usePageMetadata } from '../hooks/usePageMetadata';
import {
  User,
  GraduationCap,
  Microscope,
  BookOpen,
  FileText,
  Bookmark,
  Mail,
  Clock,
} from 'lucide-react';

interface PlaceholderSection {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  placeholderNote: string;
}

const aboutSections: PlaceholderSection[] = [
  {
    id: 'professional-profile',
    title: 'Professional Profile',
    icon: User,
    placeholderNote:
      'Official biographical statement, professional trajectory, and academic appointments will be detailed here.',
  },
  {
    id: 'academic-background',
    title: 'Academic Background',
    icon: GraduationCap,
    placeholderNote:
      'Formal academic degrees, educational trajectory, and institutional affiliations will be added upon official cataloging.',
  },
  {
    id: 'research-interests',
    title: 'Research Interests',
    icon: Microscope,
    placeholderNote:
      'Core theoretical paradigms, scientific research domains, and active inquiry agendas will be documented here.',
  },
  {
    id: 'teaching-areas',
    title: 'Teaching Areas',
    icon: BookOpen,
    placeholderNote:
      'Undergraduate and postgraduate courses taught, curriculum designs, and pedagogical specializations will be specified here.',
  },
  {
    id: 'publications',
    title: 'Publications',
    icon: FileText,
    placeholderNote:
      'Peer-reviewed journal papers, conference proceedings, monographs, and citation links will be compiled here.',
  },
  {
    id: 'books',
    title: 'Books',
    icon: Bookmark,
    placeholderNote:
      'Authored academic volumes, scholarly books, monographs, and literary publications will be cataloged here.',
  },
  {
    id: 'contact',
    title: 'Contact',
    icon: Mail,
    placeholderNote:
      'Official institutional contact channels, scholarly correspondence protocols, and communication links will be established here.',
  },
];

export function AboutPage() {
  usePageMetadata({
    title: 'About | Hemant Kumar Kushwaha',
    description:
      'About Hemant Kumar Kushwaha: Teacher, Researcher, Thinker, and Writer. Professional profile, academic background, research interests, and contact information.',
  });

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      {/* Top Identity Header */}
      <header className="border-b border-stone-200/80 bg-stone-100/40 py-12 sm:py-16">
        <Container size="xl">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
              Biographical Profile &amp; Overview
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950">
              Hemant Kumar Kushwaha
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-sm sm:text-base font-serif italic text-stone-700">
              <span>Teacher</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>Researcher</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>Thinker</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>Writer</span>
            </div>

            <p className="font-serif text-sm sm:text-base text-stone-600 italic leading-relaxed pt-2">
              &ldquo;Learn what I teach. Explore what I research. Read what I think.&rdquo;
            </p>
          </div>
        </Container>
      </header>

      {/* Structured Sections Container */}
      <Container size="xl">
        <section aria-label="About Sections" className="space-y-8">
          <div className="pb-4 border-b border-stone-200">
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
              Profile Structure
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Structured placeholder architecture for professional credentials, academic history, and official communications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aboutSections.map((section) => {
              const Icon = section.icon;
              return (
                <article key={section.id} id={section.id} className="h-full">
                  <Card className="h-full flex flex-col justify-between p-6 sm:p-7">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-stone-100 text-stone-800">
                            <Icon className="w-5 h-5 text-stone-700" aria-hidden="true" />
                          </div>
                          <h3 className="font-serif text-xl font-medium text-stone-950">
                            {section.title}
                          </h3>
                        </div>
                      </div>

                      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/70 p-4">
                        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                          {section.placeholderNote}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                      <span className="font-mono">Section: {section.id}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        Awaiting official data
                      </span>
                    </div>
                  </Card>
                </article>
              );
            })}
          </div>
        </section>
      </Container>
    </div>
  );
}
