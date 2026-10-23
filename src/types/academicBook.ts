/**
 * Academic Books Data Model & Types
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Academic Books & Scholarly Monographs Catalogue
 */

export type BookClassification =
  | 'Technical / Research Book'
  | 'Technical / Academic Book'
  | 'Technical Book'
  | 'Book';

export interface AcademicBookItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  year?: number | string;
  publisher: string;
  bookType: BookClassification;
  status: 'Published';
  isbn?: string;
  isbn13?: string;
  pages?: number | string;
  scopeDescription: string;
  targetAudience?: string;
  keyTopics?: string[];
  url: string;
  urlLabel: string;
  verifiedDestinationDescription: string;
  isResearchProminent: boolean;
}
