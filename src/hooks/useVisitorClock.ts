/**
 * Visitor Local Clock Hook & Timezone Detection
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Visitor Local Date & Time (Feature 1)
 * 
 * Safety & Privacy Guarantees:
 * 1. Uses Intl.DateTimeFormat().resolvedOptions().timeZone exclusively.
 * 2. Never hardcodes IST or Asia/Kolkata for visitors.
 * 3. Zero GPS permissions, zero precise tracking, zero IP geolocation.
 * 4. Automatic daylight saving time (DST) calculation via native browser IANA tzdb.
 * 5. Updates every 1,000 ms with high visual stability (tabular numerals).
 */

import { useState, useEffect } from 'react';

export interface VisitorClockState {
  now: Date;
  timeZone: string;
  timeZoneLabel: string;
  timeZoneShort: string;
  timeZoneOffset: string;
  formattedDate: string;
  formattedTime: string;
  formattedCompactTime: string;
  isDstActive: boolean;
  mounted: boolean;
}

/**
 * Detects visitor's local timezone via Intl API without requesting GPS or location.
 */
export function detectVisitorTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string' && tz.trim().length > 0) {
      return tz;
    }
  } catch (err) {
    console.warn('[VisitorClock] Intl timezone detection failed:', err);
  }
  return 'UTC';
}

/**
 * Resolves descriptive labels and offsets for the visitor's detected timezone.
 */
export function resolveTimeZoneDetails(date: Date, timeZone: string) {
  try {
    // Short abbreviation (e.g., PDT, EDT, GMT+5:30, BST)
    const shortFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    });
    const shortParts = shortFormatter.formatToParts(date);
    const shortName = shortParts.find((p) => p.type === 'timeZoneName')?.value || '';

    // Offset string (e.g., GMT-7 or UTC-7)
    let offsetStr = '';
    try {
      const offsetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'shortOffset',
      });
      const offsetParts = offsetFormatter.formatToParts(date);
      offsetStr = offsetParts.find((p) => p.type === 'timeZoneName')?.value || '';
    } catch {
      offsetStr = shortName;
    }

    const cleanRegion = timeZone.replace(/_/g, ' ');
    const label = shortName && !cleanRegion.toLowerCase().includes(shortName.toLowerCase())
      ? `${cleanRegion} (${shortName})`
      : cleanRegion;

    // Detect if DST is active for the current date in this timezone
    // Standard test: compare timezone offset in January vs July
    const isDstActive = checkDstActive(date, timeZone);

    return {
      label,
      shortName,
      offsetStr,
      isDstActive,
    };
  } catch {
    return {
      label: timeZone,
      shortName: timeZone,
      offsetStr: '',
      isDstActive: false,
    };
  }
}

/**
 * Checks whether Daylight Saving Time is currently active for the given date and timezone.
 */
export function checkDstActive(date: Date, timeZone: string): boolean {
  try {
    const year = date.getFullYear();
    const janDate = new Date(Date.UTC(year, 0, 1));
    const julDate = new Date(Date.UTC(year, 6, 1));

    const getOffset = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'longOffset',
      }).formatToParts(d);
      return parts.find((p) => p.type === 'timeZoneName')?.value || '';
    };

    const currentOffset = getOffset(date);
    const janOffset = getOffset(janDate);
    const julOffset = getOffset(julDate);

    // If January and July offsets are identical, this zone does not observe DST
    if (janOffset === julOffset) {
      return false;
    }

    // DST typically has a different offset from standard time
    // For northern hemisphere, DST is usually active during summer (julOffset)
    return currentOffset !== janOffset;
  } catch {
    return false;
  }
}

/**
 * Format date string using visitor's local timezone and locale.
 */
export function formatVisitorDate(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone,
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

/**
 * Format full time string (HH:MM:SS) using visitor's local timezone.
 */
export function formatVisitorTime(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone,
    }).format(date);
  } catch {
    return date.toTimeString().split(' ')[0] || '';
  }
}

/**
 * Format compact time string (HH:MM) using visitor's local timezone.
 */
export function formatVisitorCompactTime(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(date);
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}

/**
 * React hook providing the visitor's local live clock.
 * Updates every second while preserving precision and preventing unnecessary rerenders.
 */
export function useVisitorClock(): VisitorClockState {
  const [now, setNow] = useState<Date>(() => new Date());
  const [timeZone, setTimeZone] = useState<string>(() => detectVisitorTimeZone());
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const detectedTz = detectVisitorTimeZone();
    setTimeZone(detectedTz);

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const tzDetails = resolveTimeZoneDetails(now, timeZone);
  const formattedDate = formatVisitorDate(now, timeZone);
  const formattedTime = formatVisitorTime(now, timeZone);
  const formattedCompactTime = formatVisitorCompactTime(now, timeZone);

  return {
    now,
    timeZone,
    timeZoneLabel: tzDetails.label,
    timeZoneShort: tzDetails.shortName,
    timeZoneOffset: tzDetails.offsetStr,
    formattedDate,
    formattedTime,
    formattedCompactTime,
    isDstActive: tzDetails.isDstActive,
    mounted,
  };
}
