import { Link } from '../../router/RouterContext';
import { ChevronRight } from 'lucide-react';
import { Container } from './Container';

interface SectionHeaderProps {
  sectionTitle: string;
  subtitle: string;
  tagline: string;
  introDescription: string;
}

export function SectionHeader({
  sectionTitle,
  subtitle,
  tagline,
  introDescription,
}: SectionHeaderProps) {
  return (
    <header className="border-b border-stone-200/80 bg-stone-100/40 py-10 sm:py-14">
      <Container size="xl">
        <div className="max-w-3xl space-y-4">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500">
            <Link
              href="/"
              className="hover:text-stone-900 transition-colors py-1"
            >
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
            <span className="font-medium text-stone-900" aria-current="page">
              {sectionTitle}
            </span>
          </nav>

          {/* Subtitle & Tagline */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
              {subtitle}
            </span>
            <span className="text-stone-300" aria-hidden="true">&bull;</span>
            <span className="font-serif italic text-xs text-stone-600">
              &ldquo;{tagline}&rdquo;
            </span>
          </div>

          {/* Primary Page Heading */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-950">
            {sectionTitle}
          </h1>

          {/* Section Introduction */}
          <p className="text-base text-stone-600 leading-relaxed pt-1 max-w-2xl">
            {introDescription}
          </p>
        </div>
      </Container>
    </header>
  );
}
