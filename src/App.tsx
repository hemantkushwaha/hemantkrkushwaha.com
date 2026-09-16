import { RouterProvider, useRouter, Link } from './router/RouterContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { AcademicsPage } from './pages/AcademicsPage';
import { ResearchPage } from './pages/ResearchPage';
import { PhilosophyPage } from './pages/PhilosophyPage';
import { WritingsPage } from './pages/WritingsPage';
import { AboutPage } from './pages/AboutPage';
import { ContentDetailPage } from './pages/ContentDetailPage';
import { Container } from './components/common/Container';
import { Compass } from 'lucide-react';

function PageRouter() {
  const { path } = useRouter();

  // Dynamic route: /content/:slug
  if (path.startsWith('/content/')) {
    const rawSlug = path.slice('/content/'.length).split('/')[0]?.trim();
    if (rawSlug) {
      return <ContentDetailPage slug={rawSlug} key={rawSlug} />;
    }
  }

  switch (path) {
    case '/':
      return <HomePage />;
    case '/academics':
      return <AcademicsPage />;
    case '/research':
      return <ResearchPage />;
    case '/philosophy':
      return <PhilosophyPage />;
    case '/writings':
      return <WritingsPage />;
    case '/about':
      return <AboutPage />;
    default:
      return (
        <section aria-label="Page Not Found" className="py-20 sm:py-28">
          <Container size="sm">
            <div className="text-center space-y-5 rounded-2xl border border-stone-200 bg-white p-8 sm:p-12 shadow-2xs">
              <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-700">
                <Compass className="w-6 h-6" aria-hidden="true" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-950">
                Page Not Found
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                The requested page path does not exist or has moved. Return to the homepage to explore the knowledge domains.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-sm font-medium hover:bg-stone-800 transition-colors focus-visible:outline-2 focus-visible:outline-stone-900"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </Container>
        </section>
      );
  }
}

export default function App() {
  return (
    <RouterProvider>
      <Layout>
        <PageRouter />
      </Layout>
    </RouterProvider>
  );
}
