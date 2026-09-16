export interface CategoryItem {
  id: string;
  title: string;
  targetUrl: string;
  scopeDescription: string;
  plannedFormat: string;
}

export interface DomainLandingConfig {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  introDescription: string;
  categories: CategoryItem[];
}

export const academicsConfig: DomainLandingConfig = {
  id: 'academics',
  title: 'Academics',
  subtitle: 'Teaching & Pedagogy',
  tagline: 'Learn what I teach.',
  introDescription:
    'A dedicated academic repository encompassing structured course curricula, instructional frameworks, lecture syllabi, and reference materials developed for rigorous learning.',
  categories: [
    {
      id: 'courses',
      title: 'Courses & Subjects',
      targetUrl: '/academics/courses',
      scopeDescription: 'Syllabi, semester curricula, foundational coursework, and advanced academic subjects.',
      plannedFormat: 'Curriculum Outlines & Course Guides',
    },
    {
      id: 'study-material',
      title: 'Study Material',
      targetUrl: '/academics/study-material',
      scopeDescription: 'Handouts, reading companions, chapter summaries, and revision guides for students.',
      plannedFormat: 'Document Outlines & Reference Compilations',
    },
    {
      id: 'presentations',
      title: 'Presentations',
      targetUrl: '/academics/presentations',
      scopeDescription: 'Academic slide decks, visual lecture diagrams, and conceptual walkthroughs.',
      plannedFormat: 'Slide Archives & Visual Notes',
    },
    {
      id: 'interactive-learning',
      title: 'Interactive Learning',
      targetUrl: '/academics/interactive-learning',
      scopeDescription: 'Self-assessment modules, problem sets, and interactive conceptual exercises.',
      plannedFormat: 'Structured Exercises & Review Sets',
    },
    {
      id: 'books',
      title: 'Academic Books',
      targetUrl: '/academics/books',
      scopeDescription: 'Prescribed academic textbooks, scholarly volumes, and monographs.',
      plannedFormat: 'Textbook Overviews & Chapters',
    },
    {
      id: 'lectures',
      title: 'Lectures',
      targetUrl: '/academics/lectures',
      scopeDescription: 'Classroom transcripts, structured session notes, and recorded discourse outlines.',
      plannedFormat: 'Session Notes & Lecture Transcripts',
    },
  ],
};

export const researchConfig: DomainLandingConfig = {
  id: 'research',
  title: 'Research',
  subtitle: 'Inquiry & Discovery',
  tagline: 'Explore what I research.',
  introDescription:
    'Scholarly investigations, formal inquiries, published literature, patent documentations, experimental protocols, and primary datasets reflecting empirical and theoretical research.',
  categories: [
    {
      id: 'projects',
      title: 'Research Projects',
      targetUrl: '/research/projects',
      scopeDescription: 'Active and completed scientific investigations, project scopes, and methodologies.',
      plannedFormat: 'Project Documentation & Frameworks',
    },
    {
      id: 'publications',
      title: 'Publications',
      targetUrl: '/research/publications',
      scopeDescription: 'Peer-reviewed papers, journal articles, and academic conference proceedings.',
      plannedFormat: 'Citation Indexes & Abstracts',
    },
    {
      id: 'patents',
      title: 'Patents',
      targetUrl: '/research/patents',
      scopeDescription: 'Inventive intellectual property specifications, disclosures, and patent filings.',
      plannedFormat: 'Filing Details & Claims Structure',
    },
    {
      id: 'phd',
      title: 'PhD Research',
      targetUrl: '/research/phd',
      scopeDescription: 'Doctoral thesis frameworks, dissertation chapters, and foundational inquiries.',
      plannedFormat: 'Dissertation Outline & Defense Notes',
    },
    {
      id: 'experiments',
      title: 'Experiments',
      targetUrl: '/research/experiments',
      scopeDescription: 'Empirical protocols, experimental setups, reproducibility guides, and test runs.',
      plannedFormat: 'Protocols & Verification Procedures',
    },
    {
      id: 'datasets',
      title: 'Datasets',
      targetUrl: '/research/datasets',
      scopeDescription: 'Curated research corpora, structured benchmarks, and empirical measurement data.',
      plannedFormat: 'Schema Definitions & Data Archives',
    },
    {
      id: 'notes',
      title: 'Research Notes',
      targetUrl: '/research/notes',
      scopeDescription: 'Working lab logs, theoretical derivations, literature reviews, and observations.',
      plannedFormat: 'Research Notebooks & Working Papers',
    },
  ],
};

export const philosophyConfig: DomainLandingConfig = {
  id: 'philosophy',
  title: 'Philosophy',
  subtitle: 'Mind & Contemplation',
  tagline: 'Read what I think.',
  introDescription:
    'A contemplative sanctuary dedicated to systematic philosophical inquiries. This section will contain essays, reflections, and thoughts on consciousness, human existence, perception, morality, and social structures.',
  categories: [
    {
      id: 'psychology',
      title: 'Psychology',
      targetUrl: '/philosophy/psychology',
      scopeDescription: 'Inquiries into cognitive patterns, mental models, emotional landscapes, and behavior.',
      plannedFormat: 'Philosophical Essays & Analysis',
    },
    {
      id: 'relationships',
      title: 'Relationships',
      targetUrl: '/philosophy/relationships',
      scopeDescription: 'Reflections on interpersonal dynamics, empathy, social bonds, and mutual understanding.',
      plannedFormat: 'Reflective Essays & Dialogues',
    },
    {
      id: 'meditation',
      title: 'Meditation',
      targetUrl: '/philosophy/meditation',
      scopeDescription: 'Contemplative silence, mindfulness practices, interior observation, and awareness.',
      plannedFormat: 'Contemplative Guides & Notes',
    },
    {
      id: 'god-spirituality',
      title: 'God & Spirituality',
      targetUrl: '/philosophy/god-spirituality',
      scopeDescription: 'Metaphysical explorations of transcendence, the divine, existential faith, and meaning.',
      plannedFormat: 'Metaphysical Treatises & Reflections',
    },
    {
      id: 'consciousness',
      title: 'Consciousness',
      targetUrl: '/philosophy/consciousness',
      scopeDescription: 'Examinations of subjective awareness, sentience, mind-body problems, and perception.',
      plannedFormat: 'Inquiries & Phenomenological Notes',
    },
    {
      id: 'life',
      title: 'Life',
      targetUrl: '/philosophy/life',
      scopeDescription: 'Existential perspectives on purpose, mortality, time, passage, and living deliberately.',
      plannedFormat: 'Essays & Meditations',
    },
    {
      id: 'human-nature',
      title: 'Human Nature',
      targetUrl: '/philosophy/human-nature',
      scopeDescription: 'Critical examinations of instinct, morality, paradoxes of character, and ethics.',
      plannedFormat: 'Treatises & Critical Reflections',
    },
    {
      id: 'society',
      title: 'Society',
      targetUrl: '/philosophy/society',
      scopeDescription: 'Commentary on cultural evolution, collective institutions, ethics, and civil life.',
      plannedFormat: 'Social Critiques & Essays',
    },
  ],
};

export const writingsConfig: DomainLandingConfig = {
  id: 'writings',
  title: 'Writings',
  subtitle: 'Literary & Creative Works',
  tagline: 'Reflect through prose & verse.',
  introDescription:
    'A literary commons dedicated to original creative expressions. This archive will feature collections of poetry, long-form novels, short fiction, personal essays, and published book manuscripts.',
  categories: [
    {
      id: 'poetry',
      title: 'Poetry',
      targetUrl: '/writings/poetry',
      scopeDescription: 'Verses, lyrical compositions, reflective poems, and metric experiments.',
      plannedFormat: 'Verse Collections & Stanzas',
    },
    {
      id: 'novels',
      title: 'Novels',
      targetUrl: '/writings/novels',
      scopeDescription: 'Long-form fiction manuscripts, character arcs, and serialized novel excerpts.',
      plannedFormat: 'Manuscripts & Chapter Archives',
    },
    {
      id: 'short-stories',
      title: 'Short Stories',
      targetUrl: '/writings/short-stories',
      scopeDescription: 'Narrative vignettes, episodic fiction, and concise prose explorations.',
      plannedFormat: 'Narratives & Short Works',
    },
    {
      id: 'essays',
      title: 'Essays',
      targetUrl: '/writings/essays',
      scopeDescription: 'Discursive cultural, literary, and personal commentaries written in prose.',
      plannedFormat: 'Long-form Essays & Commentary',
    },
    {
      id: 'reflections',
      title: 'Reflections',
      targetUrl: '/writings/reflections',
      scopeDescription: 'Meditative thoughts, notebook musings, and personal journal fragments.',
      plannedFormat: 'Journal Fragments & Musings',
    },
    {
      id: 'books',
      title: 'Books',
      targetUrl: '/writings/books',
      scopeDescription: 'Published volumes, forthcoming manuscripts, anthologies, and book catalogs.',
      plannedFormat: 'Volume Catalogs & Overviews',
    },
  ],
};
