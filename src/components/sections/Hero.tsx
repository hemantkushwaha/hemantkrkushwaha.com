import { siteConfig } from '../../config/site';
import { Container } from '../common/Container';

export function Hero() {
  return (
    <section
      id="hero-section"
      aria-label="Introduction"
      className="py-16 sm:py-24 lg:py-28 border-b border-stone-200/80 bg-stone-50"
    >
      <Container size="lg">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Subtle Foundation Badge */}
          <div className="flex justify-center">
            <span
              id="foundation-badge"
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-700 border border-stone-200"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              Step 1: Production Foundation
            </span>
          </div>

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
        </div>
      </Container>
    </section>
  );
}
