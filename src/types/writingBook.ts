/**
 * Published Literary & Creative Books Data Model
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Domain: Writings -> Books & Publications
 */

export interface WritingBookItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  author: string;
  language: 'Hindi' | 'English' | string;
  format: 'Kindle eBook' | 'Paperback' | string;
  publisher: string;
  asin?: string;
  isbn10?: string;
  isbn13?: string;
  year?: number | string;
  genre: string;
  status: 'Published';
  description: string;
  coverImage?: string | null;
  amazonUrl: string;
  urlLabel: string;
  verifiedDestinationDescription: string;
  sourceVerified: boolean;
  metadataVerificationNotes?: string;
}
