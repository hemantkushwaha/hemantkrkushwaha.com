import { GraduationCap, Microscope, Compass, Feather, Clock } from 'lucide-react';
import { domains } from '../../config/domains';
import { Container } from '../common/Container';
import { Card } from '../common/Card';

const iconMap = {
  academics: GraduationCap,
  research: Microscope,
  philosophy: Compass,
  writings: Feather,
};

export function DomainGrid() {
  return (
    <section
      id="domains-section"
      aria-labelledby="domains-heading"
      className="py-14 sm:py-20 bg-stone-50"
    >
      <Container size="xl">
        {/* Section Header */}
        <div className="max-w-2xl mb-10 sm:mb-12">
          <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
            Platform Architecture
          </span>
          <h2
            id="domains-heading"
            className="font-serif text-2xl sm:text-3xl font-medium text-stone-950 mt-1"
          >
            Core Knowledge Domains
          </h2>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            Four foundational pillars uniting teaching, empirical research, deep reflection, and creative literary expression.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {domains.map((domain) => {
            const Icon = iconMap[domain.id];

            return (
              <article
                key={domain.id}
                id={`card-${domain.id}`}
                className="relative"
              >
                <Card
                  interactive
                  className="h-full flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header: Icon + Status */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="p-3 rounded-lg bg-stone-100 text-stone-900">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-600 border border-stone-200">
                        <Clock className="w-3 h-3 text-stone-400" />
                        Placeholder &bull; Phase Pending
                      </span>
                    </div>

                    {/* Title & Tagline */}
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-medium text-stone-950">
                        {domain.title}
                      </h3>
                      <p className="font-serif italic text-sm text-stone-600 mt-1">
                        {domain.tagline}
                      </p>
                    </div>

                    {/* Summary Description */}
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {domain.summary}
                    </p>

                    {/* Planned Architecture Preview */}
                    <div className="pt-2">
                      <p className="text-xs font-mono uppercase tracking-wider text-stone-400 mb-2">
                        Planned Modules
                      </p>
                      <ul className="flex flex-wrap gap-1.5" aria-label={`Planned modules for ${domain.title}`}>
                        {domain.plannedCategories.map((category) => (
                          <li
                            key={category}
                            className="text-xs px-2.5 py-1 rounded-md bg-stone-100/80 text-stone-700 border border-stone-200/60"
                          >
                            {category}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Visual Placeholder Indicator */}
                  <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <span className="font-mono">ID: {domain.id}</span>
                    <span className="font-medium text-stone-400">Functionality ready for Step 2+</span>
                  </div>
                </Card>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
