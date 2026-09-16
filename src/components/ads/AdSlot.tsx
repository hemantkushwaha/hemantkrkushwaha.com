import { adPolicy } from '../../config/ads';
import { AdSlotProps } from '../../types/ads';

/**
 * Architectural AdSlot Component
 * 
 * DESIGN SPECIFICATION:
 * - Centralized controller for future selective monetization
 * - In STEP 1, adPolicy.enabled is false, so this cleanly renders null
 * - Complies with: "DO NOT implement AdSense in this step. The future
 *   architecture must allow centrally controlled, selective ad placements."
 */
export function AdSlot({
  location,
  domain,
  section,
  className = '',
}: AdSlotProps) {
  // Global master switch guard
  if (!adPolicy.enabled) {
    return null;
  }

  // Domain & section exclusion guards
  if (section && adPolicy.excludedSections.includes(section)) {
    return null;
  }

  if (domain && !adPolicy.allowedDomains.includes(domain)) {
    return null;
  }

  // Future container when monetization is formally approved and configured
  return (
    <aside
      aria-label="Advertisement"
      data-ad-location={location}
      className={`my-8 mx-auto flex justify-center items-center text-xs text-stone-400 ${className}`}
    >
      {/* Ad content will be rendered here selectively by central policy */}
    </aside>
  );
}
