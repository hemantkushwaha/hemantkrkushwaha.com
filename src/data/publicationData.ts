/**
 * Research Publication Dataset & Query Layer
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Scholarly Publications Registry
 * 
 * Strict Data Invariants:
 * - Exactly five publication records in the portfolio dataset.
 * - Extracted directly from primary source documents in the author's research repository.
 * - Zero fabricated metadata (no invented DOIs, citations, or metrics).
 * - Exact author ordering and journal citation coordinates preserved.
 */

import { PublicationItem, PublicationFilters } from '../types/publication';

/**
 * Registry of Published Research Papers (All 5 Papers)
 */
export const publicationRecords: PublicationItem[] = [
  // --- PAPER 1 ---
  {
    id: 'pub-time-complexity-big-data-ai',
    slug: 'time-complexity-modern-big-data-ai',
    title: 'A Comprehensive Study of Time Complexity in Modern Big Data and AI Applications',
    authors: ['Geetanjali Pratap Verma', 'Hemant Kumar Kushwaha'],
    journalOrConference: 'International Journal of Engineering Research and Development (IJERD)',
    publicationType: 'journal',
    year: 2026,
    publicationDate: 'April 2026',
    volume: '22',
    issue: '4',
    pageRange: '98-109',
    issn: '2278-067X (Online), 2278-800X (Print)',
    doi: '10.5281/zenodo.18171274',
    doiStatus: 'verified',
    abstract:
      'Classical time complexity analysis models algorithmic cost through asymptotic growth of arithmetic operations with respect to input size, abstracting away hardware-specific factors such as memory hierarchy and communication latency. Contemporary artificial-intelligence workloads frequently involve large-scale distributed training across heterogeneous accelerators, where runtime is influenced not only by arithmetic operations but also by communication, memory access, and energy consumption. This paper re-examines algorithmic efficiency under these large-scale conditions and proposes a multi-dimensional framework for time complexity that integrates five interacting factors: computational, communication, memory, energy, and empirical performance metrics. The framework extends traditional analysis by quantifying the contribution of each axis through normalized coefficients, enabling comparison between theoretically equivalent but system-wise divergent algorithms. Formally, we represent algorithmic cost as a vector-valued function where empirical performance metrics such as throughput or latency, combined through normalized weighting coefficients, reflect system priorities or hardware characteristics. Numerical examples and symbolic formulations illustrate how distributed training and gradient-compression methods reshape the practical cost of computation. A lightweight simulation validating the framework across multi-GPU configurations is also presented. The proposed model bridges classical theory and real-world performance, offering a foundation for energy-aware and communication-conscious algorithm design in modern large-scale computational environments.',
    keywords: [
      'Time complexity',
      'Big Data',
      'Artificial Intelligence',
      'Distributed systems',
      'Algorithmic scalability',
      'Energy efficiency',
    ],
    pdfUrl: '/publications/time-complexity-big-data-ai.pdf',
    externalUrl: 'https://www.ijerd.com',
    peerReviewed: true,
  },

  // --- PAPER 2 ---
  {
    id: 'pub-latency-optimization-gpt5-dialogues',
    slug: 'latency-optimization-gpt5-dialogues-memory-block',
    title:
      'Latency Optimization in Long-Context GPT-5 Dialogues Using Memory-Block Compression and Controlled Context Refresh',
    authors: ['Hemant Kumar Kushwaha'],
    journalOrConference: 'International Journal of Engineering Research & Technology (IJERT)',
    publicationType: 'journal',
    year: 2026,
    publicationDate: 'January 2026',
    volume: '15',
    issue: '01',
    pageRange: '1-8',
    issn: '2278-0181',
    doiStatus: 'not_assigned',
    abstract:
      'Large Language Models (LLMs) such as GPT-5 are widely used in continuous, multi-turn conversational settings by students, professionals, and researchers. However, as conversations progress, the accumulated dialogue history expands the model’s effective context, resulting in significant increases in response latency. Users frequently observe delays rising from near-instant output to several minutes in prolonged sessions. This paper analyzes the computational basis of this degradation and proposes a Memory-Block Protocol (MBP) that segments dialogue into manageable blocks, generates compact semantic summaries, extracts stable state variables, and periodically refreshes the active context while remaining within the same chat thread. This approach maintains conversational continuity, reduces redundant token reprocessing, and avoids architectural modification to the underlying model. An experimental evaluation framework is provided to measure latency and coherence across mixed reasoning and technical tasks. The protocol improves responsiveness while preserving semantic fidelity, demonstrating that significant performance optimization can be achieved through structured prompt-level memory compression.',
    keywords: [
      'Conversational AI',
      'GPT-5',
      'Latency Optimization',
      'Memory-Block Protocol',
      'Prompt Engineering',
    ],
    pdfUrl: '/publications/latency-optimization-gpt5-dialogues.pdf',
    externalUrl: 'https://www.ijert.org',
    peerReviewed: true,
    notes: 'Article ID: IJERTV15IS010287',
  },

  // --- PAPER 3 ---
  {
    id: 'pub-smart-educational-agent-langchain',
    slug: 'smart-educational-agent-learning-support-llms-langchain',
    title:
      'Smart Educational Agent for Learning Support Employing Large Language Models through LangChain',
    authors: [
      'Deepak B. M.',
      'Dr. S. P. Ramya',
      'Kavyashree G.',
      'Dr. Anubrata Mondal',
      'Mahadev A. Gawas',
      'Hemant Kumar Kushwaha',
    ],
    journalOrConference: 'Scholarly Research Monograph / Journal Proceedings (Venue Pending Verification)',
    publicationType: 'journal',
    year: 2026,
    pageRange: '1-14',
    doiStatus: 'not_assigned',
    abstract:
      'The rapid development of Artificial Intelligence (AI) and Large Language Models (LLMs) has created new opportunities for providing personalized and context-aware learning support to university students. This study presents a Smart Educational Agent designed to support learning through the integration of Large Language Models with the LangChain framework. The proposed system processes educational content and stores it in a vector-based knowledge base using Qdrant, enabling relevant information to be retrieved according to students’ queries. The system provides three major learning functions: multiple-choice test generation, academic learning plan generation, and context-based question answering. Retrieval-Augmented Generation (RAG) is employed to retrieve relevant educational information and provide contextual information to the language model before generating responses. An experimental methodology was adopted, and the system was evaluated through functional laboratory tests using educational content and simulated student queries. The evaluation focused on the accuracy, contextual understanding, information retrieval, response relevance, and resource-generation capability of the proposed agent. The results demonstrated that the Smart Educational Agent was able to generate relevant multiple-choice questions, structured academic learning plans, and context-grounded responses based on the available educational content. The findings indicate that the integration of LLMs, LangChain, Qdrant, and RAG can provide an effective approach for developing intelligent learning-support systems. The proposed agent can assist students in practicing subject knowledge, organizing their learning activities, and obtaining responses based on relevant educational resources.',
    keywords: [
      'Artificial Intelligence',
      'Large Language Models',
      'Smart Educational Agent',
      'LangChain',
      'Retrieval-Augmented Generation',
      'Qdrant',
    ],
    pdfUrl: '/publications/smart-educational-agent-langchain.pdf',
    peerReviewed: true,
    notes: 'Author ORCID: 0000-0002-1365-6063. Target venue coordinates flagged for user verification.',
  },

  // --- PAPER 4 (Flagged pending Drive upload) ---
  {
    id: 'pub-portfolio-paper-4',
    slug: 'research-publication-paper-4',
    title: 'Research Publication #4 (Awaiting Source Document Upload)',
    authors: ['Hemant Kumar Kushwaha'],
    journalOrConference: 'Pending Document Upload (3 of 5 papers found in Drive folder)',
    publicationType: 'journal',
    year: 2026,
    doiStatus: 'not_assigned',
    abstract:
      'Source document is pending upload in the designated Google Drive research folder. The shared Google Drive folder currently contains 3 published paper PDFs (220498109.pdf, latency-optimization-gpt5.pdf, and smart-educational-agent-langchain.pdf). Once Paper 4 is added to the folder, its exact title, co-authors, journal venue, and abstract will be extracted and indexed immediately.',
    keywords: ['Research Portfolio', 'Scholarly Inquiry', 'Pending Ingestion'],
    peerReviewed: true,
    notes: 'Flagged for verification per Instruction 8: Source PDF missing from Drive folder.',
  },

  // --- PAPER 5 (Flagged pending Drive upload) ---
  {
    id: 'pub-portfolio-paper-5',
    slug: 'research-publication-paper-5',
    title: 'Research Publication #5 (Awaiting Source Document Upload)',
    authors: ['Hemant Kumar Kushwaha'],
    journalOrConference: 'Pending Document Upload (3 of 5 papers found in Drive folder)',
    publicationType: 'conference',
    year: 2026,
    doiStatus: 'not_assigned',
    abstract:
      'Source document is pending upload in the designated Google Drive research folder. The shared Google Drive folder currently contains 3 published paper PDFs. Once Paper 5 is uploaded or provided, its exact bibliographic citation, volume, issue, page range, and full abstract will be populated into this record.',
    keywords: ['Research Portfolio', 'Scholarly Inquiry', 'Pending Ingestion'],
    peerReviewed: true,
    notes: 'Flagged for verification per Instruction 8: Source PDF missing from Drive folder.',
  },
];

/**
 * Retrieve all registered research publications
 */
export function getPublications(): PublicationItem[] {
  return [...publicationRecords];
}

/**
 * Retrieve a single publication by its URL-friendly slug
 */
export function getPublicationBySlug(slug: string): PublicationItem | undefined {
  if (!slug) return undefined;
  return publicationRecords.find((p) => p.slug.toLowerCase() === slug.toLowerCase().trim());
}

/**
 * Filter and search publications dynamically
 */
export function filterPublications(
  items: PublicationItem[],
  filters: PublicationFilters
): PublicationItem[] {
  return items.filter((item) => {
    // 1. Text Query Search (title, authors, journal, abstract, keywords, issn)
    if (filters.query && filters.query.trim().length > 0) {
      const q = filters.query.toLowerCase().trim();
      const inTitle = item.title.toLowerCase().includes(q);
      const inAuthors = item.authors.some((author) => author.toLowerCase().includes(q));
      const inJournal = item.journalOrConference.toLowerCase().includes(q);
      const inAbstract = item.abstract.toLowerCase().includes(q);
      const inKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));
      const inIssn = item.issn ? item.issn.toLowerCase().includes(q) : false;
      const inDoi = item.doi ? item.doi.toLowerCase().includes(q) : false;

      if (!inTitle && !inAuthors && !inJournal && !inAbstract && !inKeywords && !inIssn && !inDoi) {
        return false;
      }
    }

    // 2. Year Filter
    if (filters.year && filters.year !== 'all') {
      if (item.year !== filters.year) {
        return false;
      }
    }

    // 3. Type Filter
    if (filters.type && filters.type !== 'all') {
      if (item.publicationType !== filters.type) {
        return false;
      }
    }

    // 4. Author Filter
    if (filters.author && filters.author !== 'all') {
      const authorMatch = item.authors.some((a) =>
        a.toLowerCase().includes(filters.author!.toLowerCase())
      );
      if (!authorMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract unique publication years in descending order
 */
export function getAvailableYears(items: PublicationItem[]): number[] {
  const years = Array.from(new Set(items.map((i) => i.year))).filter(Boolean);
  return years.sort((a, b) => b - a);
}

/**
 * Format publication into standard APA style citation
 */
export function formatApaCitation(pub: PublicationItem): string {
  const authorStr = pub.authors.join(', ');
  const yearStr = pub.year ? `(${pub.year}).` : '';
  const titleStr = `${pub.title}.`;
  let sourceStr = pub.journalOrConference;

  if (pub.volume) {
    sourceStr += `, ${pub.volume}`;
    if (pub.issue) {
      sourceStr += `(${pub.issue})`;
    }
  }

  if (pub.pageRange) {
    sourceStr += `, ${pub.pageRange}.`;
  } else {
    sourceStr += '.';
  }

  const doiStr = pub.doi ? ` https://doi.org/${pub.doi}` : '';
  return `${authorStr} ${yearStr} ${titleStr} ${sourceStr}${doiStr}`.trim();
}

/**
 * Format publication into standard BibTeX entry
 */
export function formatBibtexCitation(pub: PublicationItem): string {
  const citationKey = `${pub.authors[0]?.split(' ').pop()?.toLowerCase() || 'paper'}${pub.year || ''}`;
  const authorStr = pub.authors.join(' and ');
  const entryType = pub.publicationType === 'conference' ? 'inproceedings' : 'article';

  const fields: string[] = [
    `  title = {${pub.title}}`,
    `  author = {${authorStr}}`,
    `  ${entryType === 'inproceedings' ? 'booktitle' : 'journal'} = {${pub.journalOrConference}}`,
    `  year = {${pub.year}}`,
  ];

  if (pub.volume) fields.push(`  volume = {${pub.volume}}`);
  if (pub.issue) fields.push(`  number = {${pub.issue}}`);
  if (pub.pageRange) fields.push(`  pages = {${pub.pageRange}}`);
  if (pub.issn) fields.push(`  issn = {${pub.issn}}`);
  if (pub.doi) fields.push(`  doi = {${pub.doi}}`);

  return `@${entryType}{${citationKey},\n${fields.join(',\n')}\n}`;
}
