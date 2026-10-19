/**
 * Visitor Local Clock Component
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Visitor Local Date & Time (Feature 1)
 * 
 * Design Constitution Adherence:
 * - Anti-slop: Zero pulsing decorative dots, zero capsule/pill envelopes.
 * - Tabular figures: font-mono tabular-nums prevents digit jitter.
 * - Single-line containment with clean typographic separators.
 */

import { Clock } from 'lucide-react';
import { useVisitorClock } from '../../hooks/useVisitorClock';

interface VisitorClockProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function VisitorClock({ variant = 'full', className = '' }: VisitorClockProps) {
  const {
    formattedDate,
    formattedTime,
    formattedCompactTime,
    timeZoneLabel,
    timeZoneShort,
    timeZoneOffset,
    isDstActive,
    mounted,
  } = useVisitorClock();

  if (!mounted) {
    // SSR / pre-hydration placeholder with matching layout footprint
    return (
      <div className={`text-xs text-stone-400 font-mono ${className}`}>
        <span>Loading local time...</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        id="visitor-header-clock"
        aria-label={`Visitor local time: ${formattedTime} ${timeZoneShort}`}
        className={`inline-flex items-center gap-1.5 text-xs text-stone-600 font-mono tabular-nums whitespace-nowrap shrink-0 ${className}`}
        title={`Your detected local timezone: ${timeZoneLabel}`}
      >
        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" aria-hidden="true" />
        <span className="font-medium text-stone-800">{formattedCompactTime}</span>
        <span aria-hidden="true" className="text-stone-300">·</span>
        <span className="text-stone-500">{timeZoneShort || timeZoneOffset}</span>
      </div>
    );
  }

  // Full detailed variant for footer and status areas
  return (
    <div
      id="visitor-local-time-card"
      aria-label="Visitor local date and time"
      className={`space-y-2 text-left ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-900">
        <Clock className="w-3.5 h-3.5 text-stone-600 shrink-0" aria-hidden="true" />
        <span>Your Local Date &amp; Time</span>
      </div>

      {/* Date */}
      <p id="visitor-clock-date" className="text-sm font-medium text-stone-900">
        {formattedDate}
      </p>

      {/* Live Seconds Time */}
      <div className="flex items-baseline gap-2">
        <span
          id="visitor-clock-time"
          className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-stone-950 tabular-nums"
        >
          {formattedTime}
        </span>
      </div>

      {/* Timezone Details */}
      <div className="flex items-center gap-1.5 text-xs text-stone-500">
        <span id="visitor-clock-timezone" className="font-sans">
          {timeZoneLabel}
        </span>
        {timeZoneOffset && (
          <>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="font-mono tabular-nums text-stone-500">{timeZoneOffset}</span>
          </>
        )}
      </div>

      <p className="text-[11px] text-stone-400 pt-0.5">
        Automatically detected via your browser settings · No GPS or tracking
      </p>
    </div>
  );
}
