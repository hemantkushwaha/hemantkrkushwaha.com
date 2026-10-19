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
 * 4. Dual-hemisphere aware daylight saving time (DST) calculation via native browser IANA tzdb.
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
 * Resolves UTC offset in minutes for a given date in a specified timezone.
 * Returns signed minutes from UTC (e.g., +660 for UTC+11, -300 for UTC-5).
 */
export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    if (offsetStr === 'GMT' || offsetStr === 'UTC' || offsetStr === '') return 0;

    const match = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    return sign * (hours * 60 + minutes);
  } catch {
    return 0;
  }
}

/**
 * Checks whether Daylight Saving Time is currently active for the given date and timezone.
 *
 * Universal Dual-Hemisphere Algorithm:
 * - In any timezone observing DST, standard time is defined by the algebraic minimum UTC offset
 *   observed across the year (winter in that hemisphere).
 *   - Northern Hemisphere (e.g. New York): Winter in January (-300 min), Summer DST in July (-240 min).
 *     Standard offset = min(-300, -240) = -300.
 *   - Southern Hemisphere (e.g. Sydney): Winter in July (+600 min), Summer DST in January (+660 min).
 *     Standard offset = min(+660, +600) = +600.
 * - DST is active if and only if the current offset is strictly greater than standard time offset.
 */
export function checkDstActive(date: Date, timeZone: string): boolean {
  try {
    const year = date.getFullYear();
    // Sample mid-month points to avoid boundary transition edges
    const janDate = new Date(Date.UTC(year, 0, 15));
    const julDate = new Date(Date.UTC(year, 6, 15));

    const janOffsetMins = getTimeZoneOffsetMinutes(janDate, timeZone);
    const julOffsetMins = getTimeZoneOffsetMinutes(julDate, timeZone);

    // If January and July offsets are identical, this zone does not observe seasonal DST
    if (janOffsetMins === julOffsetMins) {
      return false;
    }

    // Standard time is algebraically the smaller UTC offset in minutes
    const standardOffsetMins = Math.min(janOffsetMins, julOffsetMins);
    const currentOffsetMins = getTimeZoneOffsetMinutes(date, timeZone);

    return currentOffsetMins > standardOffsetMins;
  } catch {
    return false;
  }
}

/**
 * Resolves descriptive labels and offsets for the visitor's detected timezone.
 */
export function resolveTimeZoneDetails(date: Date, timeZone: string) {
  try {
    // Short abbreviation (e.g., PDT, EDT, GMT+5:30, BST, AEDT, AEST)
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
