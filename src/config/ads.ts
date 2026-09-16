import { AdPolicy } from '../types/ads';

/**
 * Centralized Advertising Policy Configuration
 * 
 * STEP 1 STATUS: Dormant / Disabled
 * Future requirements:
 * - Content & readability always have higher priority than ads
 * - Zero intrusive popups or disruptive layout shifts
 * - Poetry, reflective writings, and interactive modules remain clean
 * - Master switch allows centralized enabling/disabling
 */
export const adPolicy: AdPolicy = {
  enabled: false, // Centrally disabled in Step 1
  maxAdsPerPage: 1,
  allowedDomains: ['academics', 'research', 'philosophy', 'writings'],
  excludedSections: ['poetry', 'interactive-learning', 'meditation'],
  allowOnMobile: false,
};
