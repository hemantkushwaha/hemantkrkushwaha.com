import { NavLink } from '../types/navigation';

export const siteConfig = {
  name: 'HEMANT KUMAR KUSHWAHA',
  title: 'Hemant Kumar Kushwaha',
  domain: 'hemantkrkushwaha.com',
  url: 'https://hemantkrkushwaha.com',
  roles: ['Teacher', 'Researcher', 'Thinker', 'Writer'],
  tagline: 'Teacher · Researcher · Thinker · Writer',
  quote: 'Learn what I teach. Explore what I research. Read what I think.',
  description:
    'Personal knowledge platform of Hemant Kumar Kushwaha covering Academics, Research, Philosophy, and Writings.',
  navLinks: [
    { label: 'Academics', href: '#academics', isPlaceholder: true },
    { label: 'Research', href: '#research', isPlaceholder: true },
    { label: 'Philosophy', href: '#philosophy', isPlaceholder: true },
    { label: 'Writings', href: '#writings', isPlaceholder: true },
  ] as NavLink[],
};
