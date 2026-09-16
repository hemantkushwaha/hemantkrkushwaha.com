import { Layout } from './components/layout/Layout';
import { Hero } from './components/sections/Hero';
import { DomainGrid } from './components/sections/DomainGrid';
import { AdSlot } from './components/ads/AdSlot';
import { Container } from './components/common/Container';
import { ShieldCheck, GitBranch, Globe, Server } from 'lucide-react';

export default function App() {
  return (
    <Layout>
      {/* Hero Section */}
      <Hero />

      {/* Centralized Ad Slot (Controlled & dormant via adPolicy in Step 1) */}
      <AdSlot location="between-sections" />

      {/* Core Knowledge Domains (Visual Placeholders) */}
      <DomainGrid />

      {/* Step 1 Architecture Readiness Verification Bar */}
      <section
        id="architecture-readiness"
        aria-label="Architecture Status"
        className="py-10 border-t border-stone-200/80 bg-stone-100/40"
      >
        <Container size="xl">
          <div className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-stone-100 text-stone-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-stone-900">
                    Step 1 Foundation Architecture Verified
                  </h3>
                  <p className="text-xs text-stone-500">
                    Ready for user testing and review before proceeding to Step 2
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Step 1 Complete
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-stone-600">
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-medium text-stone-800 block">Domain Target</span>
                  <span className="font-mono text-stone-500">hemantkrkushwaha.com</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <GitBranch className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-medium text-stone-800 block">Deploy Targets</span>
                  <span>GitHub &amp; Vercel (SPA / Edge CDN)</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Server className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-medium text-stone-800 block">Architecture</span>
                  <span>Modular React 19 + TypeScript</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </Layout>
  );
}
