/**
 * Academic Navigation Data & Model Layer
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 26 — Live Academic Navigation Slice
 * 
 * Provides clean, decoupled models and query methods for the academic
 * syllabus hierarchy without hardcoding links into unrelated components.
 * This clean layer can later be seamlessly connected to database tables.
 */

import {
  AcademicSubject,
  AcademicUnit,
  AcademicTopic,
  AcademicResource,
  AcademicBreadcrumbItem,
  AcademicQuestionItem,
} from '../types/academicNavigation.js';

export const academicSubjects: AcademicSubject[] = [
  {
    id: 'computer-networks',
    slug: 'computer-networks',
    code: 'CS-302',
    title: 'Computer Networks',
    subtitle: 'Foundations of Data Communication & Protocol Architectures',
    description:
      'A structured curriculum covering network architectures, OSI and TCP/IP protocol layering, end-to-end data transport, routing algorithms, media access control, and network security.',
    units: [
      {
        id: 'transport-layer',
        slug: 'transport-layer',
        unitNumber: 4,
        title: 'Transport Layer',
        subtitle: 'Process-to-Process Delivery & End-to-End Reliability',
        description:
          'Exploration of end-to-end transport services, port multiplexing, connection management, reliable data transfer principles, flow control, and adaptive congestion avoidance.',
        topics: [
          {
            id: 'tcp',
            slug: 'tcp',
            title: 'TCP',
            subtitle: 'Transmission Control Protocol',
            description:
              'A connection-oriented, full-duplex byte stream protocol providing end-to-end reliable data transmission, flow control through sliding windows, and congestion control via AIMD mechanisms.',
            resources: [
              {
                id: 'study-material',
                type: 'study_material',
                title: 'Study Material',
                description:
                  'Comprehensive lecture notes, packet header format diagrams, state transition walkthroughs, and analytical explanations of TCP mechanisms.',
                status: 'connected',
                statusMessage: 'Connected → Google Drive',
                source: {
                  system: 'google-drive',
                  source_id: '1El6w7DweSLfbnkdg45qdsOgFbo4BMDGj',
                  source_name: 'transport-layer-udp-tcp-guide.docx',
                  mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  web_view_link: 'https://docs.google.com/document/d/1El6w7DweSLfbnkdg45qdsOgFbo4BMDGj/edit?usp=drivesdk&ouid=111566866522796971778&rtpof=true&sd=true',
                  size_bytes: 47989,
                },
              },
              {
                id: 'ppt',
                type: 'ppt',
                title: 'PPT',
                description:
                  'Academic presentation slide deck detailing the three-way handshake, sequence/acknowledgement tracking, sliding windows, and congestion avoidance.',
                status: 'pending',
                statusMessage: 'Resource not connected yet',
              },
              {
                id: 'interactive-app',
                type: 'interactive_app',
                title: 'Interactive App',
                description:
                  'Visual simulation tool demonstrating packet transmission, timeout retransmission, RTT estimation, and dynamic congestion window graphs.',
                status: 'pending',
                statusMessage: 'Resource not connected yet',
              },
              {
                id: 'question-bank',
                type: 'question_bank',
                title: 'Question Bank',
                description:
                  'Curated academic examination questions, GATE/competitive numerical problems on TCP window calculation, and conceptual review sets.',
                status: 'pending',
                statusMessage: 'Resource not connected yet',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'design-and-analysis-of-algorithms',
    slug: 'design-and-analysis-of-algorithms',
    code: 'CS-401',
    title: 'Design and Analysis of Algorithms',
    subtitle: 'Algorithmic Paradigms, Graph Theory & Complexity Analysis',
    description:
      'A rigorous curriculum covering asymptotic analysis, divide-and-conquer, dynamic programming, greedy algorithms, advanced graph theory, shortest paths, network flows, and NP-completeness.',
    units: [
      {
        id: 'graph-algorithms',
        slug: 'graph-algorithms',
        unitNumber: 3,
        title: 'Graph Algorithms',
        subtitle: 'Traversals, Shortest Paths & Network Flow Optimization',
        description:
          'Exploration of graph representations, BFS/DFS traversals, minimum spanning trees, single-source and all-pairs shortest paths, zero-weight cycles, and directed graph walk dynamics.',
        topics: [
          {
            id: 'shortest-paths',
            slug: 'shortest-paths',
            title: 'Shortest Path Algorithms',
            subtitle: 'Shortest Walks, Zero-Weight Cycles & Path Optimization',
            description:
              'Analysis of distance metrics in weighted directed graphs, relaxation techniques (Dijkstra, Bellman-Ford), arbitrary walk formulations, and convergence in the presence of zero-weight and negative cycles.',
            resources: [
              {
                id: 'study-material',
                type: 'study_material',
                title: 'Study Material',
                description:
                  'Lecture notes, proofs of optimality, edge relaxation invariants, and step-by-step trace walkthroughs of shortest-path algorithms.',
                status: 'pending',
                statusMessage: 'Resource not connected yet',
              },
              {
                id: 'ppt',
                type: 'ppt',
                title: 'PPT',
                description:
                  'Visual slide deck detailing graph models, Dijkstra priority queues, Bellman-Ford dynamic programming, and DAG shortest paths.',
                status: 'pending',
                statusMessage: 'Resource not connected yet',
              },
              {
                id: 'interactive-app',
                type: 'interactive_app',
                title: 'Interactive App',
                description:
                  'Interactive graph visualizer for constructing weighted directed graphs and observing real-time shortest path relaxation steps.',
                status: 'pending',
                statusMessage: 'Resource not connected yet',
              },
              {
                id: 'question-bank',
                type: 'question_bank',
                title: 'Question Bank',
                description:
                  'Curated academic examination problems, university test questions, and rigorous theoretical analyses on shortest path properties and graph walks.',
                status: 'connected',
                statusMessage: '1 Solved Problem Available',
                questions: [
                  {
                    id: 'shortest-distance-shortest-walks-directed-graph',
                    slug: 'shortest-distance-shortest-walks-directed-graph',
                    title: 'Shortest Distance and Number of Shortest Walks in a Directed Graph',
                    question:
                      'A directed graph has edges S→A (1), A→B (0), B→A (0), and B→T (1). For walks that may revisit vertices, find the shortest S→T distance and the number of shortest walks. Explain briefly.',
                    answer:
                      'The shortest S→T distance is 2.\n\nEvery S→T walk must follow S→A→B initially and eventually take B→T. Between reaching B and taking B→T, the walk may traverse the zero-weight cycle B→A→B any number k ≥ 0 of times.\n\nThe total weight of such a walk is:\n\n1 + 0 + k(0 + 0) + 1 = 2\n\nBecause the cycle has weight zero, traversing it does not change the total weight. Every non-negative integer k produces a distinct S→T walk with weight 2.\n\nTherefore:\n\n- Shortest S→T distance: 2\n- Number of shortest walks: Countably infinite',
                    explanation:
                      'A walk is allowed to revisit vertices and edges. The zero-weight directed cycle between vertices A and B (A→B with weight 0 and B→A with weight 0) can be traversed any arbitrary number of times k ≥ 0 without adding any cost to the path, yielding an infinite sequence of distinct valid walks all having the minimum distance of 2.',
                    graphEdges: [
                      { from: 'S', to: 'A', weight: 1 },
                      { from: 'A', to: 'B', weight: 0 },
                      { from: 'B', to: 'A', weight: 0 },
                      { from: 'B', to: 'T', weight: 1 },
                    ],
                    mathFormula: '1 + 0 + k(0 + 0) + 1 = 2',
                    keyFindings: [
                      { label: 'Shortest S→T distance', value: '2' },
                      { label: 'Number of shortest walks', value: 'Countably infinite' },
                    ],
                    tags: ['Graph Theory', 'Shortest Paths', 'Zero-Weight Cycles', 'Graph Walks', 'DAA'],
                  },
                ],
              },
            ],
            questions: [
              {
                id: 'shortest-distance-shortest-walks-directed-graph',
                slug: 'shortest-distance-shortest-walks-directed-graph',
                title: 'Shortest Distance and Number of Shortest Walks in a Directed Graph',
                question:
                  'A directed graph has edges S→A (1), A→B (0), B→A (0), and B→T (1). For walks that may revisit vertices, find the shortest S→T distance and the number of shortest walks. Explain briefly.',
                answer:
                  'The shortest S→T distance is 2.\n\nEvery S→T walk must follow S→A→B initially and eventually take B→T. Between reaching B and taking B→T, the walk may traverse the zero-weight cycle B→A→B any number k ≥ 0 of times.\n\nThe total weight of such a walk is:\n\n1 + 0 + k(0 + 0) + 1 = 2\n\nBecause the cycle has weight zero, traversing it does not change the total weight. Every non-negative integer k produces a distinct S→T walk with weight 2.\n\nTherefore:\n\n- Shortest S→T distance: 2\n- Number of shortest walks: Countably infinite',
                explanation:
                  'A walk is allowed to revisit vertices and edges. The zero-weight directed cycle between vertices A and B (A→B with weight 0 and B→A with weight 0) can be traversed any arbitrary number of times k ≥ 0 without adding any cost to the path, yielding an infinite sequence of distinct valid walks all having the minimum distance of 2.',
                graphEdges: [
                  { from: 'S', to: 'A', weight: 1 },
                  { from: 'A', to: 'B', weight: 0 },
                  { from: 'B', to: 'A', weight: 0 },
                  { from: 'B', to: 'T', weight: 1 },
                ],
                mathFormula: '1 + 0 + k(0 + 0) + 1 = 2',
                keyFindings: [
                  { label: 'Shortest S→T distance', value: '2' },
                  { label: 'Number of shortest walks', value: 'Countably infinite' },
                ],
                tags: ['Graph Theory', 'Shortest Paths', 'Zero-Weight Cycles', 'Graph Walks', 'DAA'],
              },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Returns all available academic subjects.
 */
export function getAcademicSubjects(): AcademicSubject[] {
  return academicSubjects;
}

/**
 * Finds an academic subject by slug.
 */
export function getAcademicSubjectBySlug(subjectSlug: string): AcademicSubject | undefined {
  if (!subjectSlug) return undefined;
  return academicSubjects.find(
    (s) => s.slug.toLowerCase() === subjectSlug.toLowerCase().trim()
  );
}

/**
 * Finds a specific unit under a subject by slugs.
 */
export function getAcademicUnitBySlug(
  subjectSlug: string,
  unitSlug: string
): AcademicUnit | undefined {
  const subject = getAcademicSubjectBySlug(subjectSlug);
  if (!subject || !unitSlug) return undefined;
  return subject.units.find(
    (u) => u.slug.toLowerCase() === unitSlug.toLowerCase().trim()
  );
}

/**
 * Finds a specific topic under a unit and subject by slugs.
 */
export function getAcademicTopicBySlug(
  subjectSlug: string,
  unitSlug: string,
  topicSlug: string
): AcademicTopic | undefined {
  const unit = getAcademicUnitBySlug(subjectSlug, unitSlug);
  if (!unit || !topicSlug) return undefined;
  return unit.topics.find(
    (t) => t.slug.toLowerCase() === topicSlug.toLowerCase().trim()
  );
}

/**
 * Builds breadcrumbs for any stage of academic lecture navigation.
 */
export function buildAcademicBreadcrumbs(
  subjectSlug?: string,
  unitSlug?: string,
  topicSlug?: string
): AcademicBreadcrumbItem[] {
  const breadcrumbs: AcademicBreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Academics', href: '/academics' },
    {
      label: 'Lectures',
      href: '/academics/lectures',
      isCurrent: !subjectSlug,
    },
  ];

  if (!subjectSlug) return breadcrumbs;

  const subject = getAcademicSubjectBySlug(subjectSlug);
  const subjectTitle = subject?.title || subjectSlug;
  const subjectHref = `/academics/lectures/${subjectSlug}`;

  breadcrumbs.push({
    label: subjectTitle,
    href: subjectHref,
    isCurrent: !unitSlug,
  });

  if (!unitSlug) return breadcrumbs;

  const unit = getAcademicUnitBySlug(subjectSlug, unitSlug);
  const unitTitle = unit?.title || unitSlug;
  const unitHref = `/academics/lectures/${subjectSlug}/${unitSlug}`;

  breadcrumbs.push({
    label: unitTitle,
    href: unitHref,
    isCurrent: !topicSlug,
  });

  if (!topicSlug) return breadcrumbs;

  const topic = getAcademicTopicBySlug(subjectSlug, unitSlug, topicSlug);
  const topicTitle = topic?.title || topicSlug;

  breadcrumbs.push({
    label: topicTitle,
    isCurrent: true,
  });

  return breadcrumbs;
}

/**
 * Returns all questions associated with a specific topic.
 */
export function getAcademicQuestions(
  subjectSlug: string,
  unitSlug: string,
  topicSlug: string
): AcademicQuestionItem[] {
  const topic = getAcademicTopicBySlug(subjectSlug, unitSlug, topicSlug);
  if (!topic) return [];
  if (topic.questions && topic.questions.length > 0) {
    return topic.questions;
  }
  const qBankResource = topic.resources.find((r) => r.type === 'question_bank');
  return qBankResource?.questions || [];
}

/**
 * Finds a specific question within a topic by slug.
 */
export function getAcademicQuestionBySlug(
  subjectSlug: string,
  unitSlug: string,
  topicSlug: string,
  questionSlug: string
): AcademicQuestionItem | undefined {
  const questions = getAcademicQuestions(subjectSlug, unitSlug, topicSlug);
  if (!questionSlug) return undefined;
  return questions.find(
    (q) => q.slug.toLowerCase() === questionSlug.toLowerCase().trim() || q.id.toLowerCase() === questionSlug.toLowerCase().trim()
  );
}
