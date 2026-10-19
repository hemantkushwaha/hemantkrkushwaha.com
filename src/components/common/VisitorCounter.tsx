
import { Users, ShieldCheck, AlertCircle } from 'lucide-react';
import { useVisitorCounter } from '../../hooks/useVisitorCounter';

interface VisitorCounterProps {
  className?: string;
}

export function VisitorCounter({ className = '' }: VisitorCounterProps) {
  const { totalVisits, todayVisits, loading, error, notice } = useVisitorCounter();

  const hasValidCounts =
    typeof totalVisits === 'number' &&
    Number.isSafeInteger(totalVisits) &&
    totalVisits >= 0 &&
    typeof todayVisits === 'number' &&
    Number.isSafeInteger(todayVisits) &&
    todayVisits >= 0;

  return (
    <div
      id="visitor-counter-card"
      aria-label="Real website visitor statistics"
      aria-live="polite"
      className={`space-y-2 text-left ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-900">
        <Users className="w-3.5 h-3.5 text-stone-600 shrink-0" aria-hidden="true" />
        <span>Website Visits</span>
      </div>

      {loading ? (
        <div className="py-2 space-y-1">
          <div className="h-6 w-32 bg-stone-200/70 rounded-xs animate-pulse" />
          <p className="text-xs text-stone-400 font-sans">
            Connecting to visitor registry...
          </p>
        </div>
      ) : error || !hasValidCounts ? (
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
          <div className="flex items-baseline gap-6 pt-0.5">
            <div>
              <span className="block text-[11px] font-sans uppercase tracking-wider text-stone-500">
                Total Visits
              </span>
              <span
                id="counter-total-visits"
                className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-stone-950 tabular-nums"
              >
                {totalVisits.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-sans uppercase tracking-wider text-stone-500">
                Today&apos;s Visits (UTC)
              </span>
              <span
                id="counter-today-visits"
                className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-stone-950 tabular-nums"
              >
                {todayVisits.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
              <span>Daily resets at 00:00 UTC · Zero personal data collected</span>
            </div>

            {totalVisits === 0 ? (
              <p className="text-[11px] text-stone-500 italic">
                Counter initialized. Historical traffic prior to activation is not fabricated.
              </p>
            ) : notice ? (
              <p className="text-[11px] text-stone-400">{notice}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
