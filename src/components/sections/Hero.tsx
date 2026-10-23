import { siteConfig } from '../../config/site';
import { Container } from '../common/Container';
import { Link } from '../../router/RouterContext';
import { BookOpen, ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section
      id="hero-section"
      aria-label="Introduction"
      className="py-16 sm:py-24 lg:py-28 border-b border-stone-200/80 bg-stone-50"
    >
      <Container size="lg">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Primary Name */}
          <h1
            id="hero-author-name"
            className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-stone-950"
          >
            {siteConfig.name}
          </h1>

          {/* Roles Subtitle */}
          <p
            id="hero-roles-subtitle"
            className="text-base sm:text-lg lg:text-xl font-sans tracking-wide text-stone-600"
          >
            {siteConfig.tagline}
          </p>

          {/* Core Vision Quote */}
          <div className="pt-2 sm:pt-4">
            <blockquote
              id="hero-quote"
              className="font-serif italic text-lg sm:text-2xl text-stone-800 leading-relaxed border-t border-b border-stone-200/90 py-5 px-4"
            >
              &ldquo;{siteConfig.quote}&rdquo;
            </blockquote>
          </div>

          {/* Context Note */}
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto leading-relaxed pt-2">
            A comprehensive repository spanning academic curricula, scientific inquiry, philosophical meditations, and literary manuscripts.
          </p>

          {/* Quick Direct Links */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              id="hero-link-publications"
              href="/research/publications"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-xs sm:text-sm font-medium hover:bg-stone-800 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-stone-900"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Explore 5 Research Publications</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <Link
              id="hero-link-research"
              href="/research"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs sm:text-sm font-medium hover:bg-stone-50 hover:text-stone-950 transition-colors focus-visible:outline-2 focus-visible:outline-stone-900"
            >
              <span>Research Overview</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
