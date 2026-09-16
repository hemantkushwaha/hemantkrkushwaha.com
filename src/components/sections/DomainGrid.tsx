import { GraduationCap, Microscope, Compass, Feather, ArrowUpRight } from 'lucide-react';
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
          <h2
            id="domains-heading"
            className="font-serif text-2xl sm:text-3xl font-medium text-stone-950"
          >
            Knowledge Domains
          </h2>
          <p className="text-sm sm:text-base text-stone-600 mt-2 leading-relaxed">
            Four foundational areas uniting teaching, empirical research, deep reflection, and creative literary expression.
          </p>
        </div>

        {/* 4 Navigation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {domains.map((domain) => {
            const Icon = iconMap[domain.id];

            return (
              <a
                key={domain.id}
                href={`#${domain.id}`}
                className="group block h-full text-left rounded-xl focus-visible:outline-2 focus-visible:outline-stone-900"
              >
                <Card
                  interactive
                  className="h-full flex flex-col justify-between group-hover:border-stone-400 group-hover:shadow-sm transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Header: Icon & Subtitle */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="p-3 rounded-lg bg-stone-100 text-stone-900 group-hover:bg-stone-200/80 transition-colors">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-medium text-stone-500">
                        {domain.subtitle}
                      </span>
                    </div>

                    {/* Title & Tagline */}
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-medium text-stone-950 group-hover:text-stone-800 transition-colors">
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

                    {/* Focus Areas Preview */}
                    <div className="pt-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-2">
                        Focus Areas
                      </p>
                      <ul className="flex flex-wrap gap-1.5" aria-label={`Focus areas for ${domain.title}`}>
                        {domain.plannedCategories.map((category) => (
                          <li
                            key={category}
                            className="text-xs px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200/60"
                          >
                            {category}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="pt-5 mt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-700">
                    <span className="font-medium group-hover:text-stone-950 transition-colors">
                      Explore {domain.title}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-stone-400 group-hover:text-stone-900 transition-colors" aria-hidden="true" />
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

