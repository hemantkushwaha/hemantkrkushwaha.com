export type AdSlotLocation = 
  | 'between-sections' 
  | 'content-interior' 
  | 'desktop-sidebar' 
  | 'resource-footer';

export interface AdPolicy {
  enabled: boolean;
  maxAdsPerPage: number;
  allowedDomains: string[];
  excludedSections: string[];
  allowOnMobile: boolean;
}

export interface AdSlotProps {
  location: AdSlotLocation;
  domain?: string;
  section?: string;
  className?: string;
}
