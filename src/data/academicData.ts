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
                status: 'pending',
                statusMessage: 'Resource not connected yet',
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
