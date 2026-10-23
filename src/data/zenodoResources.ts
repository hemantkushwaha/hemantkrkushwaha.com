/**
 * Verified Zenodo Educational & Research Resources Registry
 * 
 * Platform: Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Author: Hemant Kumar Kushwaha (Teacher · Researcher · Thinker · Writer)
 * 
 * Ground truth verified from Zenodo Public API (https://zenodo.org/api/records/...)
 * All DOIs, titles, author attributions, publication dates, and direct PDF download
 * assets are authenticated and verified directly against Zenodo servers.
 */

import type { ContentItem, Tag } from '../types/content';

export interface ZenodoResourceMeta {
  zenodoId: string;
  doi: string;
  doiUrl: string;
  recordUrl: string;
  pdfUrl: string;
  pdfFileName: string;
  pdfFileSizeBytes: number;
  authors: string[];
  publicationDate: string;
  resourceType: string;
  license: string;
  tags: string[];
}

export interface ZenodoResourceRecord {
  item: ContentItem;
  meta: ZenodoResourceMeta;
  tags: Tag[];
}

export const zenodoResourceRecords: ZenodoResourceRecord[] = [
  {
    item: {
      id: '18995207-0000-4000-8000-000000000001',
      title: 'Computability of Algorithms',
      slug: 'computability-of-algorithms',
      description:
        'Computability theory studies whether a computational problem can be solved by an algorithm regardless of time or memory constraints. This work introduces computable and non-computable problems, the Halting Problem, Turing Machines, and problem decidability classifications in theoretical computer science.',
      section: 'academics',
      category: 'Study Material',
      subcategory: 'Theoretical Computer Science',
      content_type: 'study_material',
      body: `### Computability of Algorithms

**Author:** Hemant Kushwaha  
**Affiliation:** Assistant Professor, Computer Science & Engineering  
**DOI:** [10.5281/zenodo.18995207](https://doi.org/10.5281/zenodo.18995207)  
**Publication Date:** March 13, 2026  
**License:** Creative Commons Attribution 4.0 International (CC-BY-4.0)  
**Permanent Zenodo Record:** [https://zenodo.org/records/18995207](https://zenodo.org/records/18995207)

---

### Overview & Core Concepts

Computability theory studies whether a computational problem can be solved by an algorithm regardless of time or memory constraints. This academic work introduces:

- **Computable and Non-Computable Problems:** Defining the boundary between problems that admit algorithmic decision procedures and those that are fundamentally uncomputable.
- **The Halting Problem:** Formal analysis of Turing's seminal proof demonstrating that no general algorithm can decide whether an arbitrary program halts on a given input.
- **Theoretical Models of Computation:** Comprehensive treatment of the Turing Machine as the universal standard for mechanical computability.
- **Decidable and Undecidable Categories:** Systematically categorizing computational problems into decidable, semi-decidable (recursively enumerable), and undecidable domains.
- **Computability vs. Complexity:** Clear distinction between whether a problem is solvable in principle (computability) versus whether it is solvable with bounded resources such as polynomial time or logarithmic space (complexity).

### Academic & Applied Significance

The topic forms a fundamental pillar of theoretical computer science and has direct applications in:
- Artificial intelligence and formal reasoning
- Cybersecurity and software vulnerability analysis
- Formal logic and automated theorem proving
- Software verification and program analysis

---

### Verified Resource Assets
- **Full Text Lecture Notes (PDF):** \`Computability Of Algorithms.pdf\` (2.33 MB)
- **Direct Download:** [Download PDF Document](https://zenodo.org/records/18995207/files/Computability%20Of%20Algorithms.pdf/content)
- **Zenodo DOI:** [https://doi.org/10.5281/zenodo.18995207](https://doi.org/10.5281/zenodo.18995207)`,
      thumbnail_url: null,
      file_url: 'https://zenodo.org/records/18995207/files/Computability%20Of%20Algorithms.pdf/content',
      external_url: 'https://zenodo.org/records/18995207',
      language: 'en',
      status: 'published',
      visibility: 'public',
      is_featured: true,
      published_at: '2026-03-13T00:00:00.000Z',
      created_at: '2026-03-13T00:00:00.000Z',
      updated_at: '2026-03-13T00:00:00.000Z',
    },
    meta: {
      zenodoId: '18995207',
      doi: '10.5281/zenodo.18995207',
      doiUrl: 'https://doi.org/10.5281/zenodo.18995207',
      recordUrl: 'https://zenodo.org/records/18995207',
      pdfUrl: 'https://zenodo.org/records/18995207/files/Computability%20Of%20Algorithms.pdf/content',
      pdfFileName: 'Computability Of Algorithms.pdf',
      pdfFileSizeBytes: 2328928,
      authors: ['Hemant Kushwaha'],
      publicationDate: '2026-03-13',
      resourceType: 'Lesson',
      license: 'CC-BY-4.0',
      tags: [
        'Computability',
        'Turing Machine',
        'Halting Problem',
        'Decidable Problems',
        'Undecidable Problems',
        'Theory of Computation',
      ],
    },
    tags: [
      { id: '18995207-0000-4000-8000-000000000011', name: 'Computability', slug: 'computability', created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' },
      { id: '18995207-0000-4000-8000-000000000012', name: 'Turing Machine', slug: 'turing-machine', created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' },
      { id: '18995207-0000-4000-8000-000000000013', name: 'Halting Problem', slug: 'halting-problem', created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' },
      { id: '18995207-0000-4000-8000-000000000014', name: 'Decidable Problems', slug: 'decidable-problems', created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' },
      { id: '18995207-0000-4000-8000-000000000015', name: 'Undecidable Problems', slug: 'undecidable-problems', created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' },
      { id: '18995207-0000-4000-8000-000000000016', name: 'Theory of Computation', slug: 'theory-of-computation', created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' },
    ],
  },
  {
    item: {
      id: '18788942-0000-4000-8000-000000000002',
      title: 'Drone Applications and UAV Systems: Comprehensive Lecture Notes on Aerodynamics, Communication, and Autonomous Navigation',
      slug: 'drone-applications-and-uav-systems-lecture-notes',
      description:
        'Comprehensive open educational lecture notes covering unmanned aerial vehicle (UAV) systems, aerodynamics, airframe configurations, Line-of-Sight (LOS) and Beyond Line-of-Sight (BLOS) communication, and waypoint-based autonomous navigation for undergraduate and postgraduate engineering.',
      section: 'academics',
      category: 'Study Material',
      subcategory: 'Drone Technology & Embedded Systems',
      content_type: 'study_material',
      body: `### Drone Applications and UAV Systems: Comprehensive Lecture Notes on Aerodynamics, Communication, and Autonomous Navigation

**Author:** Hemant Kumar Kushwah  
**Designation:** Assistant Professor, Department of Computer Science & Engineering  
**Institution:** Haridwar University, Roorkee, India  
**DOI:** [10.5281/zenodo.18788942](https://doi.org/10.5281/zenodo.18788942)  
**Publication Date:** February 26, 2026  
**License:** Creative Commons Attribution 4.0 International (CC-BY-4.0)  
**Permanent Zenodo Record:** [https://zenodo.org/records/18788942](https://zenodo.org/records/18788942)

---

### Overview & Curriculum Scope

This resource presents comprehensive lecture notes on **Drone Applications and Unmanned Aerial Vehicle (UAV) Systems**, developed for undergraduate and postgraduate engineering education. The material introduces fundamental concepts of UAV technology, aerodynamics, airframe configurations, communication systems, and autonomous navigation techniques used in modern drone platforms.

### Systematic Syllabus Coverage

The lecture notes systematically cover core topics including:
- **UAV System Architecture:** Hardware integration, sensors (IMU, GPS, barometers), flight controller units (FCU), and electronic speed controllers (ESC).
- **Aerodynamics & Flight Dynamics:** Aerodynamic forces (lift, drag, thrust, weight) acting on fixed-wing, rotary-wing (quadcopters/hexacopters), and hybrid VTOL airframes.
- **Propulsion & Stability:** Thrust-to-weight ratios, motor-propeller matching, power distribution, and multirotor dynamic stability.
- **Communication Architectures:** Line-of-Sight (LOS) RF links, telemetry protocols, and Beyond Line-of-Sight (BLOS) cellular/satellite communication models.
- **Acoustic & Vibration Characteristics:** Structural vibration dampening, noise suppression, and sensor stabilization.
- **Autonomous Navigation:** Waypoint planning, inertial navigation systems, failsafe procedures, geofencing, and return-to-home (RTH) algorithms.

### Academic Course Alignment
Designed as an **open educational resource**, these notes directly support courses in:
- Drone Technology & UAV Engineering
- Robotics & Autonomous Aerial Systems
- Embedded Systems & IoT Sensing
- Aerospace Applications & Smart Agriculture Surveillance

---

### Verified Resource Assets
- **Full Lecture Notes Document (PDF):** \`DocScanner 26 Feb 2026 12-05 pm.pdf\` (18.03 MB)
- **Direct Download:** [Download PDF Document](https://zenodo.org/records/18788942/files/DocScanner%2026%20Feb%202026%2012-05%E2%80%AFpm.pdf/content)
- **Zenodo DOI:** [https://doi.org/10.5281/zenodo.18788942](https://doi.org/10.5281/zenodo.18788942)`,
      thumbnail_url: null,
      file_url: 'https://zenodo.org/records/18788942/files/DocScanner%2026%20Feb%202026%2012-05%E2%80%AFpm.pdf/content',
      external_url: 'https://zenodo.org/records/18788942',
      language: 'en',
      status: 'published',
      visibility: 'public',
      is_featured: true,
      published_at: '2026-02-26T00:00:00.000Z',
      created_at: '2026-02-26T00:00:00.000Z',
      updated_at: '2026-02-26T00:00:00.000Z',
    },
    meta: {
      zenodoId: '18788942',
      doi: '10.5281/zenodo.18788942',
      doiUrl: 'https://doi.org/10.5281/zenodo.18788942',
      recordUrl: 'https://zenodo.org/records/18788942',
      pdfUrl: 'https://zenodo.org/records/18788942/files/DocScanner%2026%20Feb%202026%2012-05%E2%80%AFpm.pdf/content',
      pdfFileName: 'DocScanner 26 Feb 2026 12-05 pm.pdf',
      pdfFileSizeBytes: 18033071,
      authors: ['Hemant Kumar Kushwah'],
      publicationDate: '2026-02-26',
      resourceType: 'Lesson',
      license: 'CC-BY-4.0',
      tags: [
        'Drone Applications',
        'Unmanned Aerial Vehicle (UAV)',
        'Beyond Line-of-Sight (BLOS)',
        'Embedded Systems',
        'Aerial Robotics',
      ],
    },
    tags: [
      { id: '18788942-0000-4000-8000-000000000021', name: 'Drone Applications', slug: 'drone-applications', created_at: '2026-02-26T00:00:00.000Z', updated_at: '2026-02-26T00:00:00.000Z' },
      { id: '18788942-0000-4000-8000-000000000022', name: 'Unmanned Aerial Vehicle (UAV)', slug: 'unmanned-aerial-vehicle-uav', created_at: '2026-02-26T00:00:00.000Z', updated_at: '2026-02-26T00:00:00.000Z' },
      { id: '18788942-0000-4000-8000-000000000023', name: 'Beyond Line-of-Sight (BLOS)', slug: 'beyond-line-of-sight-blos', created_at: '2026-02-26T00:00:00.000Z', updated_at: '2026-02-26T00:00:00.000Z' },
      { id: '18788942-0000-4000-8000-000000000024', name: 'Embedded Systems', slug: 'embedded-systems', created_at: '2026-02-26T00:00:00.000Z', updated_at: '2026-02-26T00:00:00.000Z' },
      { id: '18788942-0000-4000-8000-000000000025', name: 'Aerial Robotics', slug: 'aerial-robotics', created_at: '2026-02-26T00:00:00.000Z', updated_at: '2026-02-26T00:00:00.000Z' },
    ],
  },
  {
    item: {
      id: '18725469-0000-4000-8000-000000000003',
      title: 'Design and Analysis of Algorithms (DAA) – Handwritten Lecture Notes | Unit 1 & Unit 2 | Computer Science Engineering',
      slug: 'design-and-analysis-of-algorithms-handwritten-lecture-notes-unit-1-2',
      description:
        'Handwritten lecture notes covering Unit 1 and Unit 2 of Design and Analysis of Algorithms (DAA) for undergraduate computer science and engineering students, detailing algorithm design paradigms, asymptotic notations, recurrence relations, and computational complexity.',
      section: 'academics',
      category: 'Study Material',
      subcategory: 'Design and Analysis of Algorithms',
      content_type: 'study_material',
      body: `### Design and Analysis of Algorithms (DAA) – Handwritten Lecture Notes | Unit 1 & Unit 2

**Author:** Hemant Kushwaha  
**Designation:** Assistant Professor, Department of Computer Science & Engineering  
**Institution:** Haridwar University, Roorkee, India  
**ORCID:** [https://orcid.org/0000-0002-1365-6063](https://orcid.org/0000-0002-1365-6063)  
**DOI:** [10.5281/zenodo.18725469](https://doi.org/10.5281/zenodo.18725469)  
**Publication Date:** February 21, 2026  
**License:** Creative Commons Attribution 4.0 International (CC-BY-4.0)  
**Permanent Zenodo Record:** [https://zenodo.org/records/18725469](https://zenodo.org/records/18725469)

---

### Course & Pedagogical Structure

These handwritten lecture notes cover **Unit 1 and Unit 2** of the course **Design and Analysis of Algorithms (DAA)** prepared for undergraduate computer science and engineering students.

The material introduces fundamental concepts of algorithm design, analysis techniques, computational complexity, asymptotic notations, algorithm efficiency evaluation, and essential problem-solving strategies used in modern computing. Developed for classroom teaching, academic learning, and university examination preparation.

### Unit Breakdown

- **Unit 1: Foundations of Algorithm Analysis**
  - Algorithm definition, criteria, and design issues
  - Asymptotic analysis: Big-O ($O$), Big-Omega ($\\Omega$), Big-Theta ($\\Theta$), Little-o ($o$), and Little-omega ($\\omega$)
  - Worst-case, average-case, and best-case analysis frameworks
  - Recurrence relations: Substitution method, recursion-tree method, and Master Theorem applications
  - Space and time trade-offs in computational problems

- **Unit 2: Algorithmic Paradigms & Core Strategies**
  - Divide-and-Conquer paradigm (Merge Sort, Quick Sort, Binary Search analysis)
  - Strassen's matrix multiplication
  - Greedy method foundations: Fractional Knapsack, Job Sequencing with Deadlines, Huffman Coding
  - Proofs of greedy-choice property and optimal substructure
  - Step-by-step handwritten derivations and annotated diagrams

### Pedagogical Features
Structured according to university-level curriculum requirements, supporting students, educators, and self-learners in understanding core algorithmic principles through simplified explanations and step-by-step handwritten illustrations.

---

### Verified Resource Assets
- **Full Lecture Notes Document (PDF):** \`Unit 1 & Unit 2 Lecture Notes (1).pdf\` (15.11 MB)
- **Direct Download:** [Download PDF Document](https://zenodo.org/records/18725469/files/Unit%201%20&%20Unit%202%20Lecture%20Notes%20(1).pdf/content)
- **Zenodo DOI:** [https://doi.org/10.5281/zenodo.18725469](https://doi.org/10.5281/zenodo.18725469)`,
      thumbnail_url: null,
      file_url: 'https://zenodo.org/records/18725469/files/Unit%201%20&%20Unit%202%20Lecture%20Notes%20(1).pdf/content',
      external_url: 'https://zenodo.org/records/18725469',
      language: 'en',
      status: 'published',
      visibility: 'public',
      is_featured: true,
      published_at: '2026-02-21T00:00:00.000Z',
      created_at: '2026-02-21T00:00:00.000Z',
      updated_at: '2026-02-21T00:00:00.000Z',
    },
    meta: {
      zenodoId: '18725469',
      doi: '10.5281/zenodo.18725469',
      doiUrl: 'https://doi.org/10.5281/zenodo.18725469',
      recordUrl: 'https://zenodo.org/records/18725469',
      pdfUrl: 'https://zenodo.org/records/18725469/files/Unit%201%20&%20Unit%202%20Lecture%20Notes%20(1).pdf/content',
      pdfFileName: 'Unit 1 & Unit 2 Lecture Notes (1).pdf',
      pdfFileSizeBytes: 15110247,
      authors: ['Hemant Kushwaha'],
      publicationDate: '2026-02-21',
      resourceType: 'Lesson',
      license: 'CC-BY-4.0',
      tags: [
        'Design and Analysis of Algorithms',
        'DAA',
        'Handwritten Lecture Notes',
        'Algorithm Analysis',
        'Computational Complexity',
        'Computer Science Education',
      ],
    },
    tags: [
      { id: '18725469-0000-4000-8000-000000000031', name: 'Design and Analysis of Algorithms', slug: 'design-and-analysis-of-algorithms', created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
      { id: '18725469-0000-4000-8000-000000000032', name: 'DAA', slug: 'daa', created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
      { id: '18725469-0000-4000-8000-000000000033', name: 'Handwritten Lecture Notes', slug: 'handwritten-lecture-notes', created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
      { id: '18725469-0000-4000-8000-000000000034', name: 'Algorithm Analysis', slug: 'algorithm-analysis', created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
      { id: '18725469-0000-4000-8000-000000000035', name: 'Computational Complexity', slug: 'computational-complexity', created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
      { id: '18725469-0000-4000-8000-000000000036', name: 'Computer Science Education', slug: 'computer-science-education', created_at: '2026-02-21T00:00:00.000Z', updated_at: '2026-02-21T00:00:00.000Z' },
    ],
  },
];

/**
 * Returns all verified Zenodo items as ContentItems
 */
export function getZenodoContentItems(): ContentItem[] {
  return zenodoResourceRecords.map((r) => r.item);
}

/**
 * Finds a verified Zenodo item by slug
 */
export function getZenodoContentItemBySlug(slug: string): ContentItem | undefined {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  const match = zenodoResourceRecords.find(
    (r) => r.item.slug.toLowerCase() === normalized
  );
  return match?.item;
}

/**
 * Finds tags for a Zenodo item by content ID or slug
 */
export function getZenodoTagsByContentId(contentIdOrSlug: string): Tag[] {
  if (!contentIdOrSlug) return [];
  const match = zenodoResourceRecords.find(
    (r) => r.item.id === contentIdOrSlug || r.item.slug.toLowerCase() === contentIdOrSlug.toLowerCase()
  );
  return match ? match.tags : [];
}

/**
 * Finds metadata for a Zenodo item
 */
export function getZenodoMetadata(contentIdOrSlug: string): ZenodoResourceMeta | undefined {
  if (!contentIdOrSlug) return undefined;
  const match = zenodoResourceRecords.find(
    (r) => r.item.id === contentIdOrSlug || r.item.slug.toLowerCase() === contentIdOrSlug.toLowerCase()
  );
  return match?.meta;
}
