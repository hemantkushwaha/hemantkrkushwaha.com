import { Layout } from './components/layout/Layout';
import { Hero } from './components/sections/Hero';
import { DomainGrid } from './components/sections/DomainGrid';
import { AdSlot } from './components/ads/AdSlot';

export default function App() {
  return (
    <Layout>
      {/* Hero Section */}
      <Hero />

      {/* Centralized Ad Slot (Controlled & dormant via adPolicy in Step 1) */}
      <AdSlot location="between-sections" />

      {/* Core Knowledge Domains (Visual Navigation Areas) */}
      <DomainGrid />
    </Layout>
  );
}
