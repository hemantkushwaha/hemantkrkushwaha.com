/**
 * Visitor Presence Section
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Integrates Feature 1 (Visitor Local Date & Time) and Feature 2 (Real Visitor Counter)
 * into a harmonious, balanced dual-column presence band.
 */

import { VisitorClock } from './VisitorClock';
import { VisitorCounter } from './VisitorCounter';

interface VisitorPresenceSectionProps {
  className?: string;
}

export function VisitorPresenceSection({ className = '' }: VisitorPresenceSectionProps) {
  return (
    <section
      id="visitor-presence-section"
      aria-label="Visitor presence and platform statistics"
      className={`mt-10 pt-8 border-t border-stone-200/80 ${className}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Feature 1: Visitor's Local Date and Time */}
        <div className="p-4 sm:p-5 rounded-lg bg-stone-50 border border-stone-200/70">
          <VisitorClock variant="full" />
        </div>

        {/* Feature 2: Real Website Visitor Counter */}
        <div className="p-4 sm:p-5 rounded-lg bg-stone-50 border border-stone-200/70">
          <VisitorCounter />
        </div>
      </div>
    </section>
  );
}
