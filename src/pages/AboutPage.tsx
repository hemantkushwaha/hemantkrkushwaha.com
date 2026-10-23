import { useState } from 'react';
import { Container } from '../components/common/Container';
import { Card } from '../components/common/Card';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { Link } from '../router/RouterContext';
import {
  personalBio,
  academicDegrees,
  careerMilestones,
  researchInterests,
  teachingCourses,
  teachingContributions,
  authoredBooks,
  researchPreprints,
  patentInformation,
  professionalCertifications,
  scholarlyProfiles,
} from '../data/aboutData';
import { publicationRecords } from '../data/publicationData';
import {
  GraduationCap,
  Briefcase,
  Microscope,
  BookOpen,
  FileText,
  Bookmark,
  Award,
  ExternalLink,
  Mail,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Lightbulb,
  FileCode,
  Globe,
  Share2,
} from 'lucide-react';

export function AboutPage() {
  usePageMetadata({
    title: 'About | Hemant Kumar Kushwaha',
    description:
      'Academic profile of Hemant Kumar Kushwaha: Assistant Professor of Computer Science & Engineering (AI & Algorithms), PhD Researcher, author, and independent thinker.',
  });

  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(personalBio.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      {/* 1. Top Identity & Biographical Hero Header */}
      <header
        id="about-hero"
        aria-label="Author Identity Header"
        className="border-b border-stone-200/80 bg-stone-100/50 py-12 sm:py-16"
      >
        <Container size="xl">
          <div className="max-w-4xl space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Academic &amp; Intellectual Profile
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950">
                {personalBio.name}
              </h1>
              <p className="text-sm sm:text-base md:text-lg font-sans text-stone-700 leading-snug">
                {personalBio.title}
              </p>
            </div>

            {/* Platform Tagline & Philosophy */}
            <div className="border-l-2 border-stone-400 pl-4 py-1 space-y-1">
              <p className="font-serif italic text-base sm:text-lg text-stone-800">
                &ldquo;{personalBio.tagline}&rdquo;
              </p>
              <p className="text-xs sm:text-sm font-serif italic text-stone-600">
                &ldquo;{personalBio.philosophy}&rdquo;
              </p>
            </div>

            {/* Quick Metadata Bar (Zero-Pill Typographic Separators) */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-mono text-stone-600 border-t border-stone-200/80 pt-4">
              <span>CGC University, Mohali</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>PhD Researcher (2026–2029)</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>M.Tech, SRM University (2014)</span>
              <span className="text-stone-300" aria-hidden="true">&bull;</span>
              <span>12+ Years Combined Experience</span>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <Container size="xl">
        <div className="space-y-16">
          {/* Quick Section Navigation Bar */}
          <nav
            aria-label="About Page Section Links"
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs"
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-stone-600">
              <span className="text-stone-400 font-mono uppercase tracking-wider text-[11px]">Jump to:</span>
              <a href="#biography" className="hover:text-stone-950 transition-colors">Biography</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#academic-background" className="hover:text-stone-950 transition-colors">Academic Background</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#professional-journey" className="hover:text-stone-950 transition-colors">Career Timeline</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#research-interests" className="hover:text-stone-950 transition-colors">Research Areas</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#teaching-areas" className="hover:text-stone-950 transition-colors">Teaching</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#publications" className="hover:text-stone-950 transition-colors">Publications (5)</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#preprints" className="hover:text-stone-950 transition-colors">Preprints (6)</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#books" className="hover:text-stone-950 transition-colors">Books (5)</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#patents" className="hover:text-stone-950 transition-colors">Patent Filed</a>
              <span className="text-stone-200" aria-hidden="true">/</span>
              <a href="#profiles-contact" className="hover:text-stone-950 transition-colors">Profiles &amp; Contact</a>
            </div>
          </nav>

          {/* 2. Professional Profile / Biographical Narrative */}
          <section id="biography" aria-labelledby="bio-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 id="bio-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                Professional Profile
              </h2>
              <span className="text-xs font-mono text-stone-500">
                Academic &bull; Industry &bull; Research &bull; Authorship
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Narrative Text */}
              <div className="lg:col-span-2 space-y-4 text-sm sm:text-base text-stone-700 leading-relaxed font-sans">
                {personalBio.biographyParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {/* Career Highlights Panel */}
              <div className="lg:col-span-1">
                <Card className="p-6 bg-stone-50/70 border-stone-200 space-y-4">
                  <h3 className="font-serif text-lg font-medium text-stone-950 border-b border-stone-200/80 pb-2">
                    Profile Highlights
                  </h3>
                  <dl className="space-y-3 text-xs sm:text-sm">
                    <div>
                      <dt className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">Current Appointment</dt>
                      <dd className="font-medium text-stone-900 mt-0.5">Assistant Professor, CSE, CGC University</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">Doctoral Status</dt>
                      <dd className="font-medium text-stone-900 mt-0.5">PhD Scholar (Pursuing 2026–2029)</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">Experience Base</dt>
                      <dd className="font-medium text-stone-900 mt-0.5">12+ Years (Academic &amp; Industry Combined)</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">Peer-Reviewed Papers</dt>
                      <dd className="font-medium text-stone-900 mt-0.5">5 Published Scholarly Articles</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">Authored Books</dt>
                      <dd className="font-medium text-stone-900 mt-0.5">5 Volumes (Eliva Press &amp; Amazon KDP)</dd>
                    </div>
                    <div>
                      <dt className="text-stone-500 font-mono text-[11px] uppercase tracking-wider">Intellectual Property</dt>
                      <dd className="font-medium text-stone-900 mt-0.5">1 Patent Filed (CGC University, 2026)</dd>
                    </div>
                  </dl>
                </Card>
              </div>
            </div>
          </section>

          {/* 3. Academic Background */}
          <section id="academic-background" aria-labelledby="academic-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="academic-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Academic Background
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Completed Degrees &amp; Ongoing Doctoral Research
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {academicDegrees.map((deg) => (
                <Card
                  key={deg.id}
                  className={`p-6 sm:p-7 flex flex-col justify-between ${
                    deg.status === 'pursuing'
                      ? 'border-stone-400 bg-stone-50/50 shadow-2xs ring-1 ring-stone-300/60'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-stone-500">{deg.period}</span>
                      {deg.status === 'pursuing' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                          Pursuing
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                          Completed
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-950 leading-snug">
                        {deg.degree}
                      </h3>
                      <p className="text-xs font-medium text-stone-700 mt-1">
                        {deg.field}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {deg.institution}, {deg.location}
                      </p>
                    </div>

                    {deg.focusDescription && (
                      <p className="text-xs text-stone-600 leading-relaxed pt-2 border-t border-stone-100">
                        {deg.focusDescription}
                      </p>
                    )}
                  </div>

                  {deg.notes && (
                    <p className="text-[11px] text-amber-800 font-mono mt-4 pt-2 border-t border-amber-100/80">
                      *{deg.notes}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* 4. Professional Journey / Career Timeline */}
          <section id="professional-journey" aria-labelledby="journey-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="journey-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Professional Journey
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Chronological Career Trajectory (2014 &ndash; Present)
              </span>
            </div>

            <div className="relative border-l border-stone-300 ml-3 sm:ml-4 pl-6 sm:pl-8 space-y-8">
              {careerMilestones.map((item, index) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Node */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-white transition-colors ${
                      item.endYear === 'present'
                        ? 'border-stone-900 bg-stone-900'
                        : 'border-stone-400 group-hover:border-stone-800'
                    }`}
                    aria-hidden="true"
                  />

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="font-mono font-semibold text-stone-900">
                        {item.period}
                      </span>
                      <span className="text-stone-300" aria-hidden="true">&bull;</span>
                      <span className="font-mono uppercase text-stone-500 text-[11px]">
                        {item.type}
                      </span>
                      {item.location && (
                        <>
                          <span className="text-stone-300" aria-hidden="true">&bull;</span>
                          <span className="text-stone-500">{item.location}</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-950">
                      {item.role}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-stone-700">
                      {item.organization}
                    </p>

                    <ul className="space-y-1.5 pt-1 text-xs sm:text-sm text-stone-600 list-disc list-outside ml-4 leading-relaxed">
                      {item.responsibilities.map((resp, rIdx) => (
                        <li key={rIdx}>{resp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Research Interests & Core Inquiries */}
          <section id="research-interests" aria-labelledby="interests-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Microscope className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="interests-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Research Interests &amp; Inquiry
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Theoretical Paradigms &amp; Active Agendas
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {researchInterests.map((area) => (
                <Card
                  key={area.id}
                  className={`p-6 sm:p-7 flex flex-col justify-between ${
                    area.isDoctoralFocus
                      ? 'border-stone-400 bg-stone-50/70 ring-1 ring-stone-300/80'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-950 leading-snug">
                        {area.title}
                      </h3>
                      {area.isDoctoralFocus && (
                        <span className="shrink-0 text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-900 text-stone-50 font-semibold">
                          PhD Focus
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {area.summary}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex flex-wrap gap-1.5">
                    {area.keyTopics.map((topic) => (
                      <span
                        key={topic}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200/60"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* 6. Teaching Areas & Pedagogy */}
          <section id="teaching-areas" aria-labelledby="teaching-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="teaching-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Teaching Areas &amp; Pedagogy
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Curricula, Mentorship &amp; NEP 2020 Frameworks
              </span>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {teachingCourses.map((course) => (
                <Card key={course.name} className="p-5 flex flex-col justify-between bg-white border-stone-200">
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wide">
                      {course.level}
                    </span>
                    <h3 className="font-serif text-base font-medium text-stone-950 leading-snug">
                      {course.name}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed pt-1">
                      {course.focus}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pedagogical Contributions */}
            <div className="pt-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6 sm:p-7 space-y-4">
                <h3 className="font-serif text-lg font-medium text-stone-950">
                  Pedagogical Contributions &amp; Mentorship
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachingContributions.map((contrib) => (
                    <div key={contrib.title} className="space-y-1 text-xs sm:text-sm">
                      <h4 className="font-medium text-stone-900">{contrib.title}</h4>
                      <p className="text-stone-600 leading-relaxed">{contrib.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 7. Peer-Reviewed Research Publications (Exact 5 Papers) */}
          <section id="publications" aria-labelledby="publications-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-6 h-6 text-stone-700" aria-hidden="true" />
                  <h2 id="publications-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                    Peer-Reviewed Research Publications
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-600">
                  Exact five published research papers with bibliographic coordinates and journal citations.
                </p>
              </div>

              <Link
                href="/research/publications"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition-colors shadow-2xs self-start sm:self-auto shrink-0"
              >
                <span>Full Publications Platform</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-4">
              {publicationRecords.map((paper, idx) => (
                <article
                  key={paper.id}
                  className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 transition-all hover:border-stone-400 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="font-semibold text-stone-500">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-medium">
                      {paper.year}
                    </span>
                    <span className="text-stone-300" aria-hidden="true">&bull;</span>
                    <span className="font-serif italic text-stone-700">
                      {paper.journalOrConference}
                    </span>
                    {paper.volume && (
                      <span className="text-stone-500">
                        Vol. {paper.volume}{paper.issue ? `, Iss. ${paper.issue}` : ''}
                      </span>
                    )}
                    {paper.pageRange && (
                      <span className="text-stone-500">
                        pp. {paper.pageRange}
                      </span>
                    )}
                    {paper.doi && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                        DOI: {paper.doi}
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif text-lg font-medium text-stone-950">
                    <Link href="/research/publications" className="hover:underline">
                      {paper.title}
                    </Link>
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-600">
                    <span className="font-medium text-stone-900">Authors: </span>
                    {paper.authors.join(', ')}
                  </p>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {paper.abstract}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <Link
                      href="/research/publications"
                      className="font-medium text-stone-900 hover:text-stone-700 inline-flex items-center gap-1"
                    >
                      <span>Read abstract &amp; copy citations</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    {paper.pdfUrl && (
                      <a
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 8. Preprints and Ongoing Research */}
          <section id="preprints" aria-labelledby="preprints-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="preprints-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Preprints &amp; Working Papers
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Scholarly Preprints (Distinct from Peer-Reviewed Articles)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {researchPreprints.map((item) => (
                <Card key={item.id} className="p-5 flex flex-col justify-between bg-stone-50/50 border-stone-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-stone-500">
                      <span>{item.archive}</span>
                      <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 uppercase font-semibold text-[10px]">
                        Preprint
                      </span>
                    </div>

                    <h3 className="font-serif text-base font-medium text-stone-950 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      {item.scopeDescription}
                    </p>
                  </div>

                  {item.url && (
                    <div className="pt-3 mt-3 border-t border-stone-200/70 text-xs">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-stone-700 hover:text-stone-950 text-[11px]"
                      >
                        <span>Access on Zenodo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* 9. Books and Authorship (5 Authored Books) */}
          <section id="books" aria-labelledby="books-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Bookmark className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="books-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Books &amp; Authorship
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Authored Academic Textbooks &amp; Monographic Volumes (5 Titles)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {authoredBooks.map((book) => (
                <Card key={book.id} className="p-6 flex flex-col justify-between bg-white border-stone-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono text-stone-500">
                      <span>{book.year}</span>
                      <span className="text-stone-700 font-medium">{book.publisher}</span>
                    </div>

                    <div>
                      <h3 className="font-serif text-lg font-medium text-stone-950 leading-snug">
                        {book.title}
                      </h3>
                      {book.subtitle && (
                        <p className="text-xs font-serif italic text-stone-600 mt-1">
                          {book.subtitle}
                        </p>
                      )}
                    </div>

                    <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200/60">
                      {book.format}
                    </span>

                    <p className="text-xs text-stone-600 leading-relaxed pt-1">
                      {book.scopeDescription}
                    </p>
                  </div>

                  {book.url && (
                    <div className="pt-3 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                      <a
                        href={book.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-stone-900 hover:text-stone-700 transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-stone-600" />
                        <span>{book.urlLabel || 'View Book'}</span>
                        <ExternalLink className="w-3 h-3 text-stone-400" />
                      </a>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>

          {/* 10. Patents and Intellectual Property */}
          <section id="patents" aria-labelledby="patents-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Lightbulb className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="patents-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Patents &amp; Intellectual Property
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Invention Filings (Brand Analytics &amp; Computer Vision)
              </span>
            </div>

            <Card className="p-6 sm:p-8 bg-stone-50/70 border-stone-300">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-stone-600 font-medium">Institution: {patentInformation.institution}</span>
                  <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[11px]">
                    Status: {patentInformation.status} (2026)
                  </span>
                </div>

                <h3 className="font-serif text-xl sm:text-2xl font-medium text-stone-950">
                  {patentInformation.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed max-w-4xl">
                  {patentInformation.scopeDescription}
                </p>

                <p className="text-[11px] font-mono text-stone-500 pt-2 border-t border-stone-200">
                  *Note: Filed in 2026. The patent is currently pending formal examination; no patent grant or commercial claims are made.
                </p>
              </div>
            </Card>
          </section>

          {/* 11. Certifications & Academic Profiles */}
          <section id="certifications-profiles" aria-labelledby="profiles-heading" className="space-y-8 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Award className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="profiles-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Certifications &amp; Research Profiles
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Verified Scholarly Networks &amp; Faculty Development
              </span>
            </div>

            {/* Certifications Row */}
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-medium text-stone-950">
                Faculty Development &amp; Professional Certifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {professionalCertifications.map((cert) => (
                  <Card key={cert.id} className="p-4 bg-white border-stone-200 space-y-1.5">
                    {cert.year && (
                      <span className="text-[10px] font-mono text-stone-500">{cert.year}</span>
                    )}
                    <h4 className="font-medium text-xs sm:text-sm text-stone-950 leading-snug">
                      {cert.title}
                    </h4>
                    {cert.issuer && (
                      <p className="text-[11px] text-stone-500 leading-tight pt-1">
                        {cert.issuer}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Scholarly Profiles Grid */}
            <div className="space-y-3 pt-4">
              <h3 className="font-serif text-lg font-medium text-stone-950">
                Verified Academic &amp; Research Identifiers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scholarlyProfiles.map((prof) => (
                  <a
                    key={prof.id}
                    href={prof.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-4 rounded-xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-2xs transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-serif text-base font-medium text-stone-950 group-hover:text-stone-800">
                        {prof.platform}
                      </h4>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 transition-colors" />
                    </div>

                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      {prof.description}
                    </p>

                    {prof.identifierLabel && (
                      <p className="text-[11px] font-mono text-stone-500 mt-2 pt-2 border-t border-stone-100">
                        {prof.identifierLabel}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* 12. Contact & Scholarly Correspondence */}
          <section id="profiles-contact" aria-labelledby="contact-heading" className="space-y-6 scroll-mt-24">
            <div className="pb-3 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Mail className="w-6 h-6 text-stone-700" aria-hidden="true" />
                <h2 id="contact-heading" className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                  Contact &amp; Scholarly Correspondence
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Academic Inquiries &bull; Collaboration &bull; Mentorship
              </span>
            </div>

            <Card className="p-6 sm:p-8 bg-white border-stone-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-3">
                  <h3 className="font-serif text-xl font-medium text-stone-950">
                    Scholarly Inquiries &amp; Academic Communication
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    Open for academic discourse, research collaboration in self-adaptive systems and algorithms, undergraduate research mentorship, and university curriculum dialogue.
                  </p>
                  <p className="text-xs text-stone-500 italic">
                    All formal academic communication should be directed to the primary correspondence address.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-5 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                      Primary Academic Email
                    </span>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <a
                        href={`mailto:${personalBio.email}`}
                        className="font-mono text-sm sm:text-base font-medium text-stone-900 hover:underline"
                      >
                        {personalBio.email}
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                        aria-label="Copy email address"
                      >
                        {copiedEmail ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-stone-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-200/70 text-xs text-stone-500 space-y-1">
                    <p>
                      <strong>Institutional Affiliation:</strong> Department of Computer Science &amp; Engineering, CGC University, Mohali, Punjab.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </Container>
    </div>
  );
}
