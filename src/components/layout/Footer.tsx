import { siteConfig } from '../../config/site';
import { Container } from '../common/Container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="site-footer"
      className="mt-auto border-t border-stone-200/80 bg-stone-100/60 py-12 sm:py-16 text-stone-600"
    >
      <Container size="xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand & Roles */}
          <div className="space-y-2">
            <h3 className="font-serif text-lg font-medium text-stone-900 tracking-tight">
              {siteConfig.name}
            </h3>
            <p className="text-xs font-sans text-stone-600">
              {siteConfig.tagline}
            </p>
            <p className="text-xs text-stone-500 leading-relaxed max-w-sm pt-1">
              A personal digital archive and intellectual commons encompassing teaching,
              inquiry, contemplative philosophy, and literature.
            </p>
          </div>

          {/* Knowledge Domains */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
              Knowledge Domains
            </h4>
            <ul className="space-y-1.5 text-xs">
              {siteConfig.navLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-stone-600 hover:text-stone-950 transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Perspective / Platform Vision */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-900">
              Platform Vision
            </h4>
            <blockquote className="font-serif italic text-xs text-stone-600 leading-relaxed border-l-2 border-stone-300 pl-3">
              &ldquo;{siteConfig.quote}&rdquo;
            </blockquote>
            <p className="text-xs text-stone-500 pt-2">
              hemantkrkushwaha.com
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>
            &copy; {currentYear} {siteConfig.title}. All rights reserved.
          </p>
          <p className="text-stone-500">
            {siteConfig.domain}
          </p>
        </div>
      </Container>
    </footer>
  );
}
