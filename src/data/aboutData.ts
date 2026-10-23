/**
 * Academic & Professional Profile Dataset
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Source of Truth: Author CV & Primary Academic Records
 * 
 * Strict Integrity Guarantees:
 * - 12+ years of combined academic and industry experience truthfully partitioned.
 * - Completed degrees clearly distinguished from ongoing PhD (pursuing 2026–2029).
 * - Exact 7 career milestones from 2014 to present.
 * - Exact 5 peer-reviewed publications, 6 preprints, 5 authored books, and 1 patent filed.
 * - Zero fabricated metrics, awards, or completion claims.
 */

import {
  AcademicDegree,
  CareerMilestone,
  ResearchInterestArea,
  TeachingCourse,
  AuthoredBook,
  ResearchPreprint,
  PatentItem,
  CertificationItem,
  ScholarlyProfileLink,
} from '../types/about';

export const personalBio = {
  name: 'Hemant Kumar Kushwaha',
  title: 'Assistant Professor (AI & Algorithms) | PhD Researcher | Independent Researcher | Writer',
  tagline: 'Teacher · Researcher · Thinker · Writer',
  philosophy: 'Learn what I teach. Explore what I research. Read what I think.',
  email: 'hemantsrmit@gmail.com',
  summary:
    'Assistant Professor of Computer Science & Engineering with 12+ years of combined experience across university teaching, enterprise software quality, distributed data analytics, and computational research. Currently pursuing doctoral research on self-adaptive meta-computing systems for distributed AI workloads.',
  biographyParagraphs: [
    'My professional trajectory bridges university-level computer science education with rigorous enterprise engineering. Over 12+ years of combined experience, I have worked across the lifecycle of software systems—from verifying distributed data quality and architecting cloud test pipelines to designing algorithms for high-throughput AI workloads and teaching core computing disciplines to university students.',
    'Prior to my current academic appointment at CGC University, Mohali, I spent substantial years in technology engineering at Alpha Cloud Labs and Cyfuture India, where I specialized in automated software reliability, enterprise data validation, and distributed data analytics. Experiencing first-hand how real-world data pipelines struggle with scale and latency shaped my academic research trajectory: theoretical elegance in algorithms must be grounded in hardware-conscious performance, memory constraints, and adaptive resource orchestration.',
    'In parallel, my entrepreneurial journey founding an EdTech and digital publishing venture deepened my commitment to pedagogy. I believe teaching computer science is not merely about transmitting syntax or standard templates; it is about cultivating structured algorithmic thinking, mathematical intuition, and foundational reasoning. Today, my teaching, textbook authorship, and doctoral investigations converge on building adaptive computational systems and preparing the next generation of engineers under modern pedagogical frameworks such as NEP 2020.',
  ],
};

export const academicDegrees: AcademicDegree[] = [
  {
    id: 'phd-cs-ai',
    degree: 'Doctor of Philosophy (Ph.D.)',
    field: 'Computer Science / Artificial Intelligence',
    institution: 'Lamrin Tech Skills University',
    location: 'Punjab, India',
    period: '2026 – 2029',
    status: 'pursuing',
    focusDescription:
      'Researching Self-Adaptive Meta Computing System (SAMCS) for dynamic resource optimization in distributed AI workloads and heterogeneous computing clusters.',
    notes: 'Currently pursuing doctoral research; no completion or thesis award claimed.',
  },
  {
    id: 'mtech-it',
    degree: 'Master of Technology (M.Tech.)',
    field: 'Information Technology',
    institution: 'SRM University',
    location: 'Chennai, Tamil Nadu, India',
    period: '2012 – 2014',
    status: 'completed',
    focusDescription:
      'Specialized in advanced information systems, distributed data structures, social network analysis, and personalized recommendation systems.',
  },
  {
    id: 'btech-cs',
    degree: 'Bachelor of Technology (B.Tech.)',
    field: 'Computer Science & Engineering',
    institution: 'Uttar Pradesh Technical University (UPTU)',
    location: 'Uttar Pradesh, India',
    period: '2007 – 2011',
    status: 'completed',
    focusDescription:
      'Rigorous foundation in computer science principles, discrete mathematics, data structures, operating systems, and computer architecture.',
  },
];

export const careerMilestones: CareerMilestone[] = [
  {
    id: 'cgc-university',
    role: 'Assistant Professor, Computer Science & Engineering',
    organization: 'CGC University',
    location: 'Mohali, Punjab, India',
    period: 'January 2026 – Present',
    startYear: 2026,
    endYear: 'present',
    type: 'academic',
    responsibilities: [
      'Delivering undergraduate and graduate lectures in Design and Analysis of Algorithms, Machine Learning, and Computer Networks.',
      'Supervising undergraduate capstone projects and mentoring students in computational problem-solving and research methodologies.',
      'Formulating curriculum modules aligned with National Education Policy (NEP 2020) guidelines.',
      'Conducting empirical and theoretical research in adaptive computing architectures, long-context LLM optimization, and sports-media brand analytics.',
    ],
  },
  {
    id: 'quantum-university',
    role: 'Assistant Professor, CSE (Data Science)',
    organization: 'Quantum University',
    location: 'Roorkee, Uttarakhand, India',
    period: 'August 2025 – December 2025',
    startYear: 2025,
    endYear: 2025,
    type: 'academic',
    responsibilities: [
      'Taught core data science curriculum, statistical methods, and algorithmic problem-solving to engineering cohorts.',
      'Guided student academic development, managed laboratory sessions, and conducted student continuous assessments.',
    ],
  },
  {
    id: 'edtech-venture',
    role: 'Founder & Tech Lead',
    organization: 'EdTech and E-Commerce Venture',
    period: '2022 – 2025',
    startYear: 2022,
    endYear: 2025,
    type: 'entrepreneurial',
    responsibilities: [
      'Architected digital learning content systems, authored structured computer science handbooks, and established digital distribution channels.',
      'Designed technical workflows, audience engagement analytics, and e-commerce infrastructure supporting technical education materials.',
    ],
  },
  {
    id: 'cyfuture-india',
    role: 'Data Analyst Engineer',
    organization: 'Cyfuture India Pvt. Ltd.',
    location: 'Noida, India',
    period: '2022 – 2023',
    startYear: 2022,
    endYear: 2023,
    type: 'industry',
    responsibilities: [
      'Conducted statistical data analysis, developed automated reporting dashboards, and tracked operational metrics for enterprise stakeholders.',
      'Maintained pipeline data accuracy, resolved data discrepancies, and performed SQL-based ETL validation.',
    ],
  },
  {
    id: 'alpha-cloud-lead',
    role: 'Lead Data Quality Engineer',
    organization: 'Alpha Cloud Labs',
    location: 'India',
    period: '2019 – 2022',
    startYear: 2019,
    endYear: 2022,
    type: 'industry',
    responsibilities: [
      'Led the data quality assurance strategy for cloud-hosted analytics platforms and distributed data stores.',
      'Engineered automated validation suites verifying high-throughput ingestion, schema compliance, and data consistency.',
      'Collaborated with software development and cloud operations teams to establish quality benchmarks and root-cause analysis procedures.',
    ],
  },
  {
    id: 'alpha-cloud-sqe',
    role: 'Software Quality Engineer',
    organization: 'Alpha Cloud Labs',
    location: 'India',
    period: '2017 – 2019',
    startYear: 2017,
    endYear: 2019,
    type: 'industry',
    responsibilities: [
      'Designed and executed comprehensive automated test suites, functional tests, and regression protocols for cloud applications.',
      'Identified critical software anomalies, verified patch deployments, and documented release quality verification reports.',
    ],
  },
  {
    id: 'aith-kanpur',
    role: 'Lecturer, Computer Science',
    organization: 'Dr. Ambedkar Institute of Technology for Handicapped (AITH)',
    location: 'Kanpur, Uttar Pradesh, India',
    period: '2014 – 2016',
    startYear: 2014,
    endYear: 2016,
    type: 'academic',
    responsibilities: [
      'Delivered classroom lectures and conducted programming laboratories in Data Structures, Algorithms, and Discrete Mathematics.',
      'Mentored diverse undergraduate engineering cohorts, prepared examination materials, and provided academic guidance.',
    ],
  },
];

export const researchInterests: ResearchInterestArea[] = [
  {
    id: 'samcs',
    title: 'Self-Adaptive Meta Computing System (SAMCS)',
    summary:
      'My primary doctoral research direction. Investigates runtime self-adaptation mechanisms that enable distributed computing clusters to dynamically sense fluctuating AI workloads and autonomously reconfigure compute, memory, and communication topologies without manual re-engineering.',
    isDoctoralFocus: true,
    keyTopics: [
      'Dynamic Resource Allocation',
      'Runtime Workload Profiling',
      'Self-Optimizing Abstractions',
      'Doctoral Investigation (2026–2029)',
    ],
  },
  {
    id: 'meta-computing',
    title: 'Meta-Computing Systems & Adaptive Architectures',
    summary:
      'Investigating architectural layers that decouple algorithmic intent from physical hardware substrates, enabling coordinated execution across heterogeneous accelerators (CPUs, GPUs, and TPUs) in modern data centers.',
    keyTopics: ['Heterogeneous Computing', 'System-Level Orchestration', 'Execution Virtualization'],
  },
  {
    id: 'algorithms-complexity',
    title: 'Algorithm Design, Optimisation & Complexity',
    summary:
      'Re-examining classical asymptotic time complexity under large-scale constraints. Formulating multi-dimensional complexity frameworks that integrate computational arithmetic, memory hierarchy latency, inter-node communication, and energy expenditure.',
    keyTopics: ['Multi-Dimensional Complexity', 'Distributed Optimization', 'Scalability Bounds'],
  },
  {
    id: 'llm-latency',
    title: 'Large Language Models & Long-Context Optimisation',
    summary:
      'Addressing quadratic latency degradation in continuous multi-turn dialogue sessions. Developing memory compression protocols that segment dialogue history, extract state variables, and periodically refresh active attention context without altering base model weights.',
    keyTopics: ['Memory-Block Protocol (MBP)', 'Context Refresh', 'Inference Latency Reduction'],
  },
  {
    id: 'scalable-data-structures',
    title: 'Scalable Data Structures for AI Workloads',
    summary:
      'Engineering cache-efficient and parallel data representations optimized for high-dimensional vector spaces, distributed tensor caching, and real-time graph traversal.',
    keyTopics: ['Vector Index Structures', 'Cache Locality', 'High-Throughput State Stores'],
  },
  {
    id: 'quantum-inspired',
    title: 'Quantum-Inspired Computing Models',
    summary:
      'Translating quantum mechanical principles—such as superposition representations and amplitude amplification—into classical algorithmic frameworks for high-complexity combinatorial search and scheduling problems.',
    keyTopics: ['State-Space Coexistence', 'Combinatorial Search', 'Probabilistic Representations'],
  },
  {
    id: 'educational-ai-agents',
    title: 'Educational AI Agents & Retrieval-Augmented Generation (RAG)',
    summary:
      'Developing curriculum-aligned pedagogical agents using LangChain, vector databases (e.g. Qdrant), and retrieval-augmented generation to provide context-grounded assessment generation, personalized study planning, and real-time student learning support.',
    keyTopics: ['LangChain Orchestration', 'Vector Knowledge Bases', 'Grounded Pedagogical Tutoring'],
  },
  {
    id: 'brand-analytics',
    title: 'Brand Analytics & Computer Vision Media Measurement',
    summary:
      'Investigating computer-vision and deep-learning models capable of tracking, segmenting, and measuring cumulative brand logo visibility and exposure across rapid camera zoom, panning, and dynamic viewing perspectives in sports broadcasts.',
    keyTopics: ['Sports-Media Computer Vision', 'Exposure Quantification', 'Perspective Invariance'],
  },
];

export const teachingCourses: TeachingCourse[] = [
  {
    name: 'Design and Analysis of Algorithms',
    level: 'Undergraduate / Core',
    focus: 'Asymptotic notation, divide-and-conquer, greedy heuristics, dynamic programming, graph algorithms, and NP-completeness.',
  },
  {
    name: 'Data Structures and Algorithms',
    level: 'Undergraduate / Foundational',
    focus: 'Linear and non-linear representations, balanced trees, heaps, hash tables, and algorithm efficiency analysis in C++ and Python.',
  },
  {
    name: 'Computer Networks',
    level: 'Undergraduate / Core',
    focus: 'OSI and TCP/IP layered architecture, routing protocols, transport-layer flow/congestion control, socket programming, and protocol security.',
  },
  {
    name: 'Network Security Using AI',
    level: 'Advanced / Elective',
    focus: 'Anomaly detection, intrusion prevention systems, automated threat classification using machine learning, and cryptographic fundamentals.',
  },
  {
    name: 'Machine Learning and Artificial Intelligence',
    level: 'Undergraduate / Specialization',
    focus: 'Supervised and unsupervised paradigms, loss surfaces, gradient descent, neural architectures, and model evaluation metrics.',
  },
  {
    name: 'Discrete Mathematics',
    level: 'Undergraduate / Mathematical Foundation',
    focus: 'Set theory, propositional and predicate logic, recurrence relations, combinatorics, graph theory, and formal proof techniques.',
  },
  {
    name: 'Sampling Techniques & Statistical Methods',
    level: 'Undergraduate / Analytical',
    focus: 'Probability distributions, hypothesis testing, sampling methods, confidence intervals, and empirical data validation.',
  },
  {
    name: 'Programming & Computational Problem-Solving',
    level: 'Undergraduate / Practical Laboratory',
    focus: 'Structured algorithmic design, modular code construction, memory debugging, and competitive problem-solving.',
  },
];

export const teachingContributions = [
  {
    title: 'Curriculum Development Aligned with NEP 2020',
    description:
      'Designed course modules incorporating outcome-based education (OBE), multidisciplinary skill tracks, continuous practical assessments, and experiential learning in compliance with National Education Policy (NEP 2020) frameworks.',
  },
  {
    title: 'Undergraduate Project Supervision & Mentoring',
    description:
      'Guided over dozens of undergraduate capstone teams through the complete project lifecycle: problem formulation, literature review, software architecture, prototype development, and academic reporting.',
  },
  {
    title: 'Socratic & Proof-Grounded Pedagogy',
    description:
      'Bridged rigorous mathematical proofs with tangible software implementations, helping students understand not only how algorithms work, but why they fail under scale and how to reason about computational constraints.',
  },
  {
    title: 'Pedagogical Faculty Development (UGC-FDP)',
    description:
      'Certified under the UGC-FDP on NEP-2020: Orientation & Sensitization (2026), applying modern learning taxonomies and student-centric evaluation methods in daily teaching practice.',
  },
];

export const authoredBooks: AuthoredBook[] = [
  {
    id: 'book-meta-computing',
    title: 'META-COMPUTING: A Self-Optimizing Architecture for Adaptive AI Workloads in Distributed Computing Systems',
    publisher: 'Eliva Press',
    year: 2026,
    format: 'Academic Monograph / Scholarly Volume',
    scopeDescription:
      'Presents a comprehensive architectural model for self-adaptive computing. Proposes dynamic abstraction layers capable of restructuring execution pipelines in response to fluctuating AI workloads across heterogeneous distributed environments.',
  },
  {
    id: 'book-think-in-sets',
    title: 'Think in Sets – A Beginner’s Guide to Discrete Maths',
    subtitle: 'Foundations of Logic, Structures, and Reasoning for Computer Science',
    publisher: 'Amazon KDP',
    year: 2025,
    format: 'Academic Textbook',
    scopeDescription:
      'An introductory pedagogical handbook designed to bridge mathematical intuition and computer science practice through set theory, formal propositional logic, relations, and combinatorial reasoning.',
  },
  {
    id: 'book-total-state-space',
    title: 'Total State–Space Coexistence Theory',
    subtitle: 'A Structural Framework for Time, Probability, and Experience',
    publisher: 'Amazon KDP',
    year: 'Scholarly Volume',
    format: 'Theoretical Treatise',
    scopeDescription:
      'Explores structural state spaces, temporal emergence, and probabilistic coexistence models, offering a formalized framework bridging computational theory and philosophical inquiry.',
  },
  {
    id: 'book-web-stories',
    title: 'The Complete Guide to Web Stories',
    subtitle: 'Strategies, Tools and Techniques for Successful Storytelling',
    publisher: 'Amazon KDP',
    year: 2022,
    format: 'Technical & Strategy Guide',
    scopeDescription:
      'A practical and analytical guide examining mobile-first visual narrative architectures, AMP-based web storytelling standards, and digital audience engagement methodologies.',
  },
  {
    id: 'book-data-structures',
    title: 'Data Structures: Approach to Programming',
    publisher: 'Amazon KDP',
    year: 2016,
    format: 'Foundational Textbook',
    scopeDescription:
      'A systematic introduction to programming abstractions, linear and non-linear memory representations, tree and graph traversals, and algorithmic complexity analysis for aspiring software engineers.',
  },
];

export const researchPreprints: ResearchPreprint[] = [
  {
    id: 'preprint-samcs-evaluation',
    title: 'Experimental Evaluation of a Meta-Computing-Based Self-Adaptive System for Dynamic Resource Optimisation',
    author: 'Hemant Kumar Kushwaha',
    archive: 'Open Scholarly Archive (Zenodo / SSRN)',
    status: 'preprint',
    scopeDescription:
      'Empirical benchmarks evaluating runtime resource adjustments and dynamic workload partitioning in a self-adaptive meta-computing simulation environment.',
    url: 'https://doi.org/10.5281/zenodo.19152178',
  },
  {
    id: 'preprint-time-complexity-multidimensional',
    title: 'Time Complexity in the Age of Big Data and Artificial Intelligence: A Multi-Dimensional Framework',
    author: 'Hemant Kumar Kushwaha',
    archive: 'Open Scholarly Archive',
    status: 'preprint',
    scopeDescription:
      'Extends asymptotic runtime notation by incorporating memory hierarchy delays, distributed interconnect synchronization, and hardware energy metrics.',
  },
  {
    id: 'preprint-sttem',
    title: 'State Transition-Based Temporal Emergence Model (STTEM)',
    author: 'Hemant Kumar Kushwaha',
    archive: 'Theoretical Working Paper Archive',
    status: 'preprint',
    scopeDescription:
      'A mathematical exploration of discrete state transitions and emergent temporal order within deterministic computational systems.',
  },
  {
    id: 'preprint-meta-computing-distributed',
    title: 'A Meta-Computing Architecture for Adaptive Optimization of AI Workloads in Distributed Systems',
    author: 'Hemant Kumar Kushwaha',
    archive: 'Scholarly Working Paper',
    status: 'preprint',
    scopeDescription:
      'Proposes a decentralized scheduler and metadata synchronization protocol for heterogeneous multi-accelerator server clusters.',
  },
  {
    id: 'preprint-enhanced-mbp',
    title: 'Enhanced Memory-Block Protocol for Latency Optimization in Long-Context GPT Dialogues',
    author: 'Hemant Kumar Kushwaha',
    archive: 'AI Systems Preprint Repository',
    status: 'preprint',
    scopeDescription:
      'Presents heuristic algorithms for adaptive token compression and checkpointing across extended conversational inference sessions.',
  },
  {
    id: 'preprint-total-state-space',
    title: 'Total State–Space Coexistence Theory',
    author: 'Hemant Kumar Kushwaha',
    archive: 'Open Theoretical Archive',
    status: 'preprint',
    scopeDescription:
      'Theoretical manuscript exploring computational state spaces, probability distributions across parallel trajectories, and observer-dependent state reduction.',
  },
];

export const patentInformation: PatentItem = {
  id: 'patent-brand-analytics-2026',
  title: 'System and Method for Measuring Brand Exposure in Sports-Media Content Under Dynamic Camera Viewing Conditions',
  institution: 'CGC University, Mohali',
  year: 2026,
  status: 'Patent filed',
  scopeDescription:
    'A computer-vision and deep-learning methodology engineered to detect, track, and quantitatively measure brand logo visibility in broadcast sports footage under rapid variations in camera zoom, pan angle, motion blur, and perspective distortion. Status: Patent filed (pending formal examination; no grant claimed).',
};

export const professionalCertifications: CertificationItem[] = [
  {
    id: 'cert-ugc-fdp',
    title: 'UGC-FDP on NEP-2020: Orientation & Sensitization',
    issuer: 'University Grants Commission (UGC) / Malaviya Mission Teacher Training Programme',
    year: 2026,
  },
  {
    id: 'cert-dsa-python',
    title: 'Data Structures and Algorithms using Python – Part 2',
    issuer: 'Professional Technical Certification',
  },
  {
    id: 'cert-tensorflow',
    title: 'Complete Guide to TensorFlow for Deep Learning with Python',
    issuer: 'Deep Learning Specialization Program',
  },
  {
    id: 'cert-google-ads',
    title: 'Google Ads for Beginners',
    issuer: 'Digital Marketing & Analytics Foundation',
  },
];

export const scholarlyProfiles: ScholarlyProfileLink[] = [
  {
    id: 'google-scholar',
    platform: 'Google Scholar',
    url: 'https://scholar.google.com/citations?user=0GJ55cMAAAAJ',
    description: 'Citations, peer-reviewed indices, and verified scholarly publications.',
    identifierLabel: 'User: 0GJ55cMAAAAJ',
  },
  {
    id: 'researchgate',
    platform: 'ResearchGate',
    url: 'https://www.researchgate.net/profile/Hemant-Kushwaha-5',
    description: 'Research items, working papers, scientific inquiries, and academic networking.',
    identifierLabel: 'Profile: Hemant-Kushwaha-5',
  },
  {
    id: 'orcid',
    platform: 'ORCID',
    url: 'https://orcid.org/0000-0002-1365-6063',
    description: 'Persistent digital identifier for verified researcher attribution and scholarly activities.',
    identifierLabel: '0000-0002-1365-6063',
  },
  {
    id: 'github',
    platform: 'GitHub',
    url: 'https://github.com/hemantkushwaha',
    description: 'Open-source code repositories, algorithm implementations, and experimental benchmarks.',
    identifierLabel: '@hemantkushwaha',
  },
  {
    id: 'zenodo',
    platform: 'Zenodo',
    url: 'https://doi.org/10.5281/zenodo.19152178',
    description: 'Open research data, citable preprints, and scientific digital artifacts.',
    identifierLabel: 'DOI: 10.5281/zenodo.19152178',
  },
  {
    id: 'ssrn',
    platform: 'SSRN',
    url: 'https://hq.ssrn.com/Participant.cfm?rectype=edit&partID=10714077',
    description: 'Social Science Research Network scholarly author repository and working papers.',
    identifierLabel: 'Author ID: 10714077',
  },
];
