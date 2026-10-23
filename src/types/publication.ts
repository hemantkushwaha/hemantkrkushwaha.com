/**
 * Research Publication Types & Interfaces
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Scholarly Research Publications Architecture
 * 
 * Strict Metadata Guidelines:
 * - Preserves exact author names and publication order.
 * - Records volume, issue, page range, ISSN, abstract, and keywords.
 * - DOI status is strictly verified; never fabricated.
 */

export type PublicationType = 'journal' | 'conference' | 'book_chapter' | 'working_paper';

export type DoiStatus = 'verified' | 'pending_verification' | 'not_assigned';

export interface PublicationAuthor {
  name: string;
  isPrimary?: boolean;
  affiliation?: string;
}

export interface PublicationItem {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  journalOrConference: string;
  publicationType: PublicationType;
  year: number;
  publicationDate?: string; // e.g. "June 2023" or ISO string
  volume?: string;
  issue?: string;
  pageRange?: string; // e.g. "124-135"
  issn?: string;
  isbn?: string;
  doi?: string;
  doiStatus: DoiStatus;
  abstract: string;
  keywords: string[];
  pdfUrl?: string;
  externalUrl?: string;
  citationText?: string;
  peerReviewed: boolean;
  notes?: string;
}

export interface PublicationFilters {
  query?: string;
  year?: number | 'all';
  type?: PublicationType | 'all';
  author?: string | 'all';
}
