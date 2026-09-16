import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { siteConfig } from '../../config/site';
import { Container } from '../common/Container';
import { Link, useRouter } from '../../router/RouterContext';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { path } = useRouter();
  const navRef = useRef<HTMLElement>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  return (
    <header
      id="site-header"
      ref={navRef}
      className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-stone-50/95 backdrop-blur-xs"
    >
      <Container size="xl">
        <div className="flex h-20 items-center justify-between">
          {/* Logo / Author Branding */}
          <Link
            id="brand-link"
            href="/"
            className="group flex flex-col focus-visible:outline-2 focus-visible:outline-stone-900 rounded-sm py-1"
          >
            <span className="font-serif text-lg sm:text-xl md:text-2xl font-medium tracking-tight text-stone-950 transition-colors group-hover:text-stone-700">
              {siteConfig.name}
            </span>
            <span className="text-[10px] sm:text-xs tracking-wider text-stone-500 font-sans">
              Teacher · Researcher · Thinker · Writer
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            id="desktop-nav"
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 lg:gap-2"
          >
            {siteConfig.navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3.5 py-2 text-sm font-medium text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-stone-900"
                activeClassName="text-stone-950 bg-stone-200/70 font-semibold"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center md:hidden">
            <button
              id="mobile-menu-toggle"
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2.5 rounded-lg text-stone-700 hover:text-stone-950 hover:bg-stone-100 min-w-[44px] min-h-[44px] focus-visible:outline-2 focus-visible:outline-stone-900 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile Navigation"
            className="md:hidden py-4 border-t border-stone-200 space-y-1 bg-stone-50 max-h-[calc(100vh-5rem)] overflow-y-auto"
          >
            {siteConfig.navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={closeMobileMenu}
                className="flex items-center justify-between px-4 py-3 text-base font-medium text-stone-800 hover:bg-stone-100 rounded-lg min-h-[44px]"
                activeClassName="text-stone-950 bg-stone-200/80 font-semibold"
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </Container>
    </header>
  );
}
