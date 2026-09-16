export type DomainId = 'academics' | 'research' | 'philosophy' | 'writings';

export interface DomainCategory {
  id: string;
  title: string;
  description?: string;
}

export interface DomainItem {
  id: DomainId;
  title: string;
  subtitle: string;
  tagline: string;
  summary: string;
  plannedCategories: string[];
  accentColor: string;
}
