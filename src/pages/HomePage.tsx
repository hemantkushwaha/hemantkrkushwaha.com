import { Hero } from '../components/sections/Hero';
import { DomainGrid } from '../components/sections/DomainGrid';
import { AdSlot } from '../components/ads/AdSlot';
import { usePageMetadata } from '../hooks/usePageMetadata';

export function HomePage() {
  usePageMetadata({
    title: 'Hemant Kumar Kushwaha | Teacher · Researcher · Thinker · Writer',
    description:
      'Personal knowledge platform of Hemant Kumar Kushwaha covering Academics, Research, Philosophy, and Writings. Learn what I teach. Explore what I research. Read what I think.',
  });

  return (
    <>
      {/* Hero Section */}
      <Hero />

      {/* Centralized Ad Slot (Controlled & dormant via adPolicy in Step 1) */}
      <AdSlot location="between-sections" />

      {/* Core Knowledge Domains (Visual Navigation Areas) */}
      <DomainGrid />
    </>
  );
}
