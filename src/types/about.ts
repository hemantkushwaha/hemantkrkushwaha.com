/**
 * About Page Data Types & Academic Profile Definitions
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Academic Profile & Biographical Information Model
 */

export interface AcademicDegree {
  id: string;
  degree: string;
  field: string;
  institution: string;
  location: string;
  period: string;
  status: 'completed' | 'pursuing';
  focusDescription?: string;
  notes?: string;
}

export interface CareerMilestone {
  id: string;
  role: string;
  organization: string;
  location?: string;
  period: string;
  startYear: number;
  endYear: number | 'present';
  type: 'academic' | 'industry' | 'entrepreneurial';
  responsibilities: string[];
}

export interface ResearchInterestArea {
  id: string;
  title: string;
  summary: string;
  isDoctoralFocus?: boolean;
  keyTopics: string[];
}

export interface TeachingCourse {
  name: string;
  level: string;
  focus: string;
}

export interface AuthoredBook {
  id: string;
  title: string;
  subtitle?: string;
  publisher: string;
  year?: number | string;
  format: string;
  scopeDescription: string;
}

export interface ResearchPreprint {
  id: string;
  title: string;
  author: string;
  archive: string;
  status: 'preprint';
  scopeDescription: string;
  doi?: string;
  url?: string;
}

export interface PatentItem {
  id: string;
  title: string;
  institution: string;
  year: number;
  status: 'Patent filed';
  scopeDescription: string;
}

export interface CertificationItem {
  id: string;
  title: string;
  issuer?: string;
  year?: number | string;
}

export interface ScholarlyProfileLink {
  id: string;
  platform: string;
  url: string;
  description: string;
  identifierLabel?: string;
}
