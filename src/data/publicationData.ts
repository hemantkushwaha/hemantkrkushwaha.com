/**
 * Research Publication Dataset & Query Layer
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Scholarly Publications Registry — All 5 Published Papers
 * 
 * Strict Data Invariants:
 * - Exactly five publication records corresponding to the five author research papers.
 * - Extracted directly from primary source documents.
 * - Zero fabricated metadata (no invented DOIs, citations, or metrics).
 * - Exact author ordering and journal citation coordinates preserved.
 */

import { PublicationItem, PublicationFilters } from '../types/publication';

/**
 * Registry of Published Research Papers (Exact 5 Papers)
 */
export const publicationRecords: PublicationItem[] = [
  // --- PAPER 1 (2026) ---
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
    notes: 'Date of Submission: 20-03-2026, Date of Acceptance: 03-04-2026.',
  },

  // --- PAPER 2 (2026) ---
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
    notes: 'Article ID: IJERTV15IS010287. Licensed under CC BY 4.0.',
  },

  // --- PAPER 3 (2026) ---
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
    journalOrConference: 'Scholarly Research Article (Publication Venue Details Pending Verification)',
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
    ],
    pdfUrl: '/publications/smart-educational-agent-langchain.pdf',
    peerReviewed: true,
    notes: 'Corresponding Author: Deepak B. M. Hemant Kumar Kushwaha ORCID: 0000-0002-1365-6063.',
  },

  // --- PAPER 4 (2014) ---
  {
    id: 'pub-personalized-recommender-system-2014',
    slug: 'personalized-recommender-system-online-social-networks',
    title:
      'Personalized Recommender System (A Personal Recommender System for Online Social Networking Sites)',
    authors: ['Hemant Kumar Kushwaha', 'J. Jeysree'],
    journalOrConference: 'International Journal of Computer Applications (IJCA)',
    publicationType: 'journal',
    year: 2014,
    publicationDate: 'May 2014',
    volume: '93',
    issue: '9',
    pageRange: '1-6',
    issn: '0975-8887',
    doiStatus: 'not_assigned',
    abstract:
      'Recommender system for online marketing site plays a key role for the e-marketing or purchase made online by consumers. As there are many recommendations for a particular keyword, determining which recommendations have higher impact for a particular user is difficult. So it is useful to make a personal recommender based on the user preferences may helpful in solving such a problems and can deliver a good search result. Based on user actions (preferences, like) within a close group like any networking site a best personalized recommender can be designed. As the growing popularity of www every things going to be dependent on the virtual world, e-commerce and e-advertisement are the very important aspect of them, the growing popularity of www also leaded to virtualized one’s friend. So this work is defining an approach in which the personal relationships between friends is calculated after that this calculation can be used to determine the good recommender for a particular user based on his/her friends reviews and his/her preferences.',
    keywords: [
      'Trust',
      'Trust_Friend',
      'Recommender',
      'Trust metrics',
      'ego user close-nest',
    ],
    externalUrl: 'https://www.ijcaonline.org',
    peerReviewed: true,
    notes: 'Department of Information Technology, SRM University, Kattankulathur, India.',
  },

  // --- PAPER 5 (2014) ---
  {
    id: 'pub-trust-system-social-networking-2014',
    slug: 'trust-system-revelent-useful-facts-social-networking',
    title:
      'Trust_System: How to know which fact is revelent and useful within a social networking site',
    authors: ['Hemant Kumar Kushwaha', 'Ms. J. Jeysree'],
    journalOrConference: 'International Journal of Engineering Development and Research (IJEDR)',
    publicationType: 'journal',
    year: 2014,
    publicationDate: '2014',
    volume: '2',
    issue: '1',
    pageRange: '704-712',
    issn: '2321-9939',
    doiStatus: 'not_assigned',
    abstract:
      'Trust plays a very useful role in our daily life. In the modern life where everything is based on the virtual world say World Wide Web, it is very difficult to know about whom to trust and why. Most of the social recommender systems are based on the trust rating of users. Hence, it\'s important to calculate the possible relations between users in the social network and to evaluate those relations properly to improve the social recommender system for a particular user. This particular user would be termed as ego user in our Trust_System. As the popularity of social network sites grow on the worldwide web, each individual has a long friend-list on facebook. While evaluating closeness among friends is difficult, fortunately there are many user actions which can be used to evaluate their relation on the social network. The trustworthiness of a product can be determined by the facts which are being calculated by their opinion about the given facts. In this research work Trust_Friend algorithm and True_Fact algorithm are used for solving both problems e.g. closeness of friends for social recommender system (Trust_Recommeder for Trust_System) on a popular social networking site facebook.',
    keywords: [
      'Component Trust',
      'Trustworthiness of facts',
      'social network',
      'internet',
      'worldwide web',
      'truefact algorithm',
      'facebook4j',
      'Trust_Recommeder',
      'Trust_Friend',
      'Java',
      'netbeanIDE',
    ],
    externalUrl: 'https://www.ijedr.org',
    peerReviewed: true,
    notes: 'Paper ID: IJEDR1401128. Department of Information Technology, SRM University, Kattankulathur, India.',
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
    sourceStr += `, pp. ${pub.pageRange}.`;
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
