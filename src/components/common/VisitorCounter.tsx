/**
 * Real Website Visitor Counter Component
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Real Website Visitor Counter (Feature 2)
 * 
 * Design Constitution Adherence:
 * - Anti-slop: Zero artificial scoreboards, zero glowing neon badges.
 * - Tabular figures: font-mono tabular-nums for aligned digits.
 * - Honest states: Explicitly communicates empty/initial counts without fabricating numbers.
 * - Fault tolerance: Renders quiet fallback if API is unreachable without breaking page layout.
 */

import { Users, ShieldCheck, AlertCircle } from 'lucide-react';
import { useVisitorCounter } from '../../hooks/useVisitorCounter';

interface VisitorCounterProps {
  className?: string;
}

export function VisitorCounter({ className = '' }: VisitorCounterProps) {
  const { totalVisits, todayVisits, loading, error, notice } = useVisitorCounter();

  return (
    <div
      id="visitor-counter-card"
      aria-label="Real website visitor statistics"
      className={`space-y-2 text-left ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-900">
        <Users className="w-3.5 h-3.5 text-stone-600 shrink-0" aria-hidden="true" />
        <span>Website Visits</span>
      </div>

      {loading ? (
        <div className="py-2 space-y-1">
          <div className="h-6 w-32 bg-stone-200/70 rounded-xs animate-pulse" />
          <p className="text-xs text-stone-400 font-sans">Connecting to visitor registry...</p>
        </div>
      ) : error ? (
        <div className="py-1 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-stone-600">
            <AlertCircle className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
            <span>Counter statistics temporarily unavailable</span>
          </div>
          <p className="text-[11px] text-stone-400">
            Platform features remain fully accessible.
          </p>
        </div>
      ) : (
        <>
          {/* Main Counters Row */}
          <div className="flex items-baseline gap-6 pt-0.5">
            <div>
              <span className="block text-[11px] font-sans uppercase tracking-wider text-stone-500">
                Total Visits
              </span>
              <span
                id="counter-total-visits"
                className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-stone-950 tabular-nums"
              >
                {typeof totalVisits === 'number' ? totalVisits.toLocaleString() : '0'}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-sans uppercase tracking-wider text-stone-500">
                Today&apos;s Visits
              </span>
              <span
                id="counter-today-visits"
                className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-stone-950 tabular-nums"
              >
                {typeof todayVisits === 'number' ? todayVisits.toLocaleString() : '0'}
              </span>
            </div>
          </div>

          {/* Genuine Data Footnote */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
              <span>Genuine server-counted sessions · Zero personal data collected</span>
            </div>

            {totalVisits === 0 ? (
              <p className="text-[11px] text-stone-500 italic">
                Counter initialized. Historical traffic prior to activation is not fabricated.
              </p>
            ) : notice ? (
              <p className="text-[11px] text-stone-400">
                {notice}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
