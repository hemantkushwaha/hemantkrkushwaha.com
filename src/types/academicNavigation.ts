/**
 * Academic Navigation & Syllabus Hierarchy Types
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 26 — Live Academic Navigation Slice
 * 
 * Hierarchy:
 * Academics → Lectures → Subject (Computer Networks) → Unit (Transport Layer) → Topic (TCP) → 4 Resources
 */

export type AcademicResourceType =
  | 'study_material'
  | 'ppt'
  | 'interactive_app'
  | 'question_bank';

export interface AcademicResourceSource {
  system: 'google-drive';
  source_id: string;
  source_name: string;
  mime_type: string;
  web_view_link?: string;
  size_bytes?: number;
}

export interface AcademicResource {
  id: string;
  type: AcademicResourceType;
  title: string;
  description: string;
  status: 'pending' | 'connected';
  statusMessage: string;
  source?: AcademicResourceSource;
}

export interface AcademicTopic {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  resources: AcademicResource[];
}

export interface AcademicUnit {
  id: string;
  slug: string;
  unitNumber?: number;
  title: string;
  subtitle?: string;
  description: string;
  topics: AcademicTopic[];
}

export interface AcademicSubject {
  id: string;
  slug: string;
  code?: string;
  title: string;
  subtitle?: string;
  description: string;
  units: AcademicUnit[];
}

export interface AcademicBreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}
