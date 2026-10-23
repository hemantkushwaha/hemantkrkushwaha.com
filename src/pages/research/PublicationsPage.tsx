import { useState, useMemo } from 'react';
import { Container } from '../../components/common/Container';
import { SectionHeader } from '../../components/common/SectionHeader';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { Link } from '../../router/RouterContext';
import {
  publicationRecords,
  filterPublications,
  getAvailableYears,
  formatApaCitation,
  formatBibtexCitation,
} from '../../data/publicationData';
import { PublicationItem, PublicationType } from '../../types/publication';
import {
  Search,
  Filter,
  FileText,
  BookOpen,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag as TagIcon,
  Sparkles,
  Download,
  AlertCircle,
  Table as TableIcon,
  RotateCcw,
} from 'lucide-react';

export function PublicationsPage() {
  usePageMetadata({
    title: 'Research Publications | Hemant Kumar Kushwaha',
    description:
      'Peer-reviewed journal articles, conference papers, and scholarly publications authored by Hemant Kumar Kushwaha with complete citation metadata.',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<PublicationType | 'all'>('all');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showVerificationTable, setShowVerificationTable] = useState(false);

  const availableYears = useMemo(() => getAvailableYears(publicationRecords), []);

  const filteredItems = useMemo(() => {
    let result = filterPublications(publicationRecords, {
      query: searchQuery,
      year: selectedYear,
      type: selectedType,
    });

    if (selectedKeyword) {
      result = result.filter((item) =>
        item.keywords.some((kw) => kw.toLowerCase() === selectedKeyword.toLowerCase())
      );
    }

    return result;
  }, [searchQuery, selectedYear, selectedType, selectedKeyword]);

  const toggleAbstract = (id: string) => {
    setExpandedAbstracts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyCitation = (pub: PublicationItem, format: 'apa' | 'bibtex') => {
    const text = format === 'apa' ? formatApaCitation(pub) : formatBibtexCitation(pub);
    navigator.clipboard.writeText(text);
    setCopiedId(`${pub.id}-${format}`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedYear('all');
    setSelectedType('all');
    setSelectedKeyword(null);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedYear !== 'all' ||
    selectedType !== 'all' ||
    selectedKeyword !== null;

  return (
    <div className="space-y-12 sm:space-y-16 pb-20">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumbs" className="border-b border-stone-200 bg-stone-50/60 py-3.5">
        <Container size="xl">
          <ol className="flex items-center gap-2 text-xs font-mono text-stone-600">
            <li>
              <Link href="/" className="hover:text-stone-900 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-400">
              /
            </li>
            <li>
              <Link href="/research" className="hover:text-stone-900 transition-colors">
                Research
              </Link>
            </li>
            <li aria-hidden="true" className="text-stone-400">
              /
            </li>
            <li aria-current="page" className="font-semibold text-stone-900">
              Publications
            </li>
          </ol>
        </Container>
      </nav>

      {/* Section Header */}
      <SectionHeader
        sectionTitle="Research Publications"
        subtitle="Scholarly Works & Peer-Reviewed Literature"
        tagline="Empirical discoveries, analytical models, and peer-reviewed contributions."
        introDescription="A formal scholarly repository cataloging peer-reviewed research papers and conference proceedings by Hemant Kumar Kushwaha. Every entry preserves exact bibliographic attribution, citation coordinates, and abstracts."
      />

      <Container size="xl">
        <div className="space-y-8">
          {/* Top Control Bar: Total Count & Verification Table Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/80">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-stone-900 text-stone-50 text-xs font-mono font-medium">
                {publicationRecords.length}
              </span>
              <div>
                <h3 className="text-sm font-medium text-stone-900">
                  {publicationRecords.length === 1
                    ? '1 Published Paper'
                    : `${publicationRecords.length} Published Research Papers`}
                </h3>
                <p className="text-xs text-stone-500">
                  Author: Hemant Kumar Kushwaha · Peer-reviewed scholarly portfolio
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowVerificationTable(!showVerificationTable)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-2xs"
              >
                <TableIcon className="w-3.5 h-3.5 text-stone-500" />
                {showVerificationTable ? 'Hide Verification Table' : 'Show Verification Table'}
              </button>
            </div>
          </div>

          {/* Verification Table (Mandatory Verification View) */}
          {showVerificationTable && (
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <h3 className="font-serif text-lg font-medium text-stone-950">
                    Scholarly Publication Verification Matrix
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Comparative audit of titles, authors, venues, years, and verified DOI status.
                  </p>
                </div>
                <span className="text-xs font-mono text-stone-500">
                  {publicationRecords.length} verified records
                </span>
              </div>

              {publicationRecords.length === 0 ? (
                <div className="p-8 text-center text-sm text-stone-500 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                  No publication records loaded yet. Ingestion pending source PDFs.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/80 text-stone-700 font-medium">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Paper Title</th>
                        <th className="py-2.5 px-3">Author(s) & Order</th>
                        <th className="py-2.5 px-3">Journal / Conference</th>
                        <th className="py-2.5 px-3">Year</th>
                        <th className="py-2.5 px-3">DOI Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-800">
                      {publicationRecords.map((pub, idx) => (
                        <tr key={pub.id} className="hover:bg-stone-50/50">
                          <td className="py-3 px-3 font-mono font-medium text-stone-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-medium text-stone-900 max-w-xs">
                            {pub.title}
                          </td>
                          <td className="py-3 px-3 text-stone-700 max-w-xs">
                            {pub.authors.join(', ')}
                          </td>
                          <td className="py-3 px-3 text-stone-600">
                            {pub.journalOrConference}
                            {pub.volume && ` (Vol. ${pub.volume})`}
                          </td>
                          <td className="py-3 px-3 font-mono text-stone-600">{pub.year}</td>
                          <td className="py-3 px-3">
                            {pub.doi ? (
                              <a
                                href={`https://doi.org/${pub.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-stone-800 underline hover:text-stone-950 inline-flex items-center gap-1"
                              >
                                {pub.doi}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="font-mono text-stone-500 text-[11px] bg-stone-100 px-2 py-0.5 rounded">
                                {pub.doiStatus === 'not_assigned'
                                  ? 'Not assigned'
                                  : 'Pending verification'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-5 sm:p-6 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Search Query Input */}
              <div className="md:col-span-6 relative">
                <label htmlFor="pub-search" className="sr-only">
                  Search publications
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="pub-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, journal, keyword, or ISSN…"
                    className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50/60 border border-stone-200 rounded-lg placeholder-stone-400 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Year Filter Dropdown */}
              <div className="md:col-span-3">
                <label htmlFor="pub-year" className="sr-only">
                  Filter by Year
                </label>
                <select
                  id="pub-year"
                  value={selectedYear}
                  onChange={(e) =>
                    setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="w-full py-2 px-3 text-sm bg-stone-50/60 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter Dropdown */}
              <div className="md:col-span-3">
                <label htmlFor="pub-type" className="sr-only">
                  Filter by Type
                </label>
                <select
                  id="pub-type"
                  value={selectedType}
                  onChange={(e) =>
                    setSelectedType(e.target.value as PublicationType | 'all')
                  }
                  className="w-full py-2 px-3 text-sm bg-stone-50/60 border border-stone-200 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  <option value="all">All Publication Types</option>
                  <option value="journal">Peer-Reviewed Journals</option>
                  <option value="conference">Conference Proceedings</option>
                </select>
              </div>
            </div>

            {/* Keyword Chip Filter & Reset */}
            {selectedKeyword && (
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100 text-xs text-stone-600">
                <span>Active Keyword:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900 text-stone-50 font-medium">
                  {selectedKeyword}
                  <button
                    type="button"
                    onClick={() => setSelectedKeyword(null)}
                    className="hover:text-stone-300 ml-1"
                    aria-label="Remove keyword filter"
                  >
                    ×
                  </button>
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-stone-500 hover:text-stone-900 underline ml-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Filter Summary & Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100 gap-2">
              <span>
                Showing {filteredItems.length} of {publicationRecords.length} papers
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-950 font-medium self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* Publications List Feed */}
          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white p-12 text-center space-y-4 shadow-2xs">
              <div className="mx-auto w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-medium text-stone-950">
                {publicationRecords.length === 0
                  ? 'Publications Pending Source Documents'
                  : 'No Publications Match Current Filters'}
              </h3>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                {publicationRecords.length === 0
                  ? 'The publication dataset will display the five papers once the source PDFs are provided and verified.'
                  : 'Try broadening your search query or resetting active year and type filters.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredItems.map((pub, index) => {
                const isExpanded = !!expandedAbstracts[pub.id];
                return (
                  <article
                    key={pub.id}
                    className="rounded-xl border border-stone-200 bg-white p-6 sm:p-8 shadow-2xs space-y-6 transition-all hover:border-stone-300"
                  >
                    {/* Header: Catalog Badge, Venue, Year */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono px-2.5 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                          PAPER #{index + 1}
                        </span>
                        <span className="font-medium text-stone-600 uppercase tracking-wider text-[11px]">
                          {pub.publicationType === 'journal' ? 'Peer-Reviewed Journal' : 'Conference Paper'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-stone-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{pub.year}</span>
                      </div>
                    </div>

                    {/* Paper Title */}
                    <div>
                      <h3 className="font-serif text-xl sm:text-2xl font-medium text-stone-950 leading-snug">
                        {pub.title}
                      </h3>

                      {/* Authors (with order preserved) */}
                      <p className="text-sm text-stone-700 mt-2.5">
                        <span className="text-stone-500 font-medium text-xs uppercase tracking-wider mr-1.5">
                          Authors:
                        </span>
                        {pub.authors.map((author, aIdx) => {
                          const isHemant = author.toLowerCase().includes('kushwaha');
                          return (
                            <span key={aIdx}>
                              <span
                                className={
                                  isHemant
                                    ? 'font-semibold text-stone-950 underline decoration-stone-300 underline-offset-2'
                                    : 'text-stone-700'
                                }
                              >
                                {author}
                              </span>
                              {aIdx < pub.authors.length - 1 && ', '}
                            </span>
                          );
                        })}
                      </p>

                      {/* Venue & Citation Coordinates */}
                      <p className="text-xs text-stone-600 mt-1.5 italic">
                        {pub.journalOrConference}
                        {pub.volume && `, Volume ${pub.volume}`}
                        {pub.issue && `, Issue ${pub.issue}`}
                        {pub.pageRange && `, pp. ${pub.pageRange}`}
                        {pub.publicationDate && ` (${pub.publicationDate})`}
                      </p>
                    </div>

                    {/* Identifiers: ISSN & DOI */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100 text-xs">
                      {pub.issn && (
                        <span className="inline-flex items-center gap-1 text-stone-600 font-mono bg-stone-50 px-2.5 py-1 rounded border border-stone-200">
                          ISSN: {pub.issn}
                        </span>
                      )}

                      {pub.doi ? (
                        <a
                          href={`https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-stone-800 font-mono bg-stone-50 hover:bg-stone-100 px-2.5 py-1 rounded border border-stone-200 transition-colors"
                        >
                          DOI: {pub.doi}
                          <ExternalLink className="w-3 h-3 text-stone-500" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-stone-500 font-mono bg-stone-50 px-2.5 py-1 rounded border border-stone-200">
                          DOI: {pub.doiStatus === 'not_assigned' ? 'Not assigned' : 'Pending verification'}
                        </span>
                      )}

                      {pub.peerReviewed && (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-sans bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                          ✓ Peer-Reviewed
                        </span>
                      )}
                    </div>

                    {/* Abstract Section */}
                    {pub.abstract && (
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => toggleAbstract(pub.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-900 hover:text-stone-700 transition-colors"
                          aria-expanded={isExpanded}
                        >
                          <span>{isExpanded ? 'Hide Abstract' : 'Read Abstract'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4 rounded-lg bg-stone-50 text-stone-700 text-xs leading-relaxed border border-stone-200/70 animate-fadeIn">
                            <p className="font-serif italic text-stone-600 mb-1">Abstract:</p>
                            <p>{pub.abstract}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Keywords */}
                    {pub.keywords && pub.keywords.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <TagIcon className="w-3 h-3 text-stone-400 mr-1" />
                        {pub.keywords.map((kw, kwIdx) => (
                          <button
                            key={kwIdx}
                            type="button"
                            onClick={() => setSelectedKeyword(kw)}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80 transition-colors"
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action Bar: Citation Copy & External Links */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCitation(pub, 'apa')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
                        >
                          {copiedId === `${pub.id}-apa` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied APA</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-400" />
                              <span>Copy APA</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyCitation(pub, 'bibtex')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors"
                        >
                          {copiedId === `${pub.id}-bibtex` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied BibTeX</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-400" />
                              <span>BibTeX</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {pub.pdfUrl && (
                          <a
                            href={pub.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </a>
                        )}

                        {pub.externalUrl && (
                          <a
                            href={pub.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-800 text-xs font-medium hover:bg-stone-50 transition-colors"
                          >
                            <span>Publisher Portal</span>
                            <ExternalLink className="w-3 h-3 text-stone-500" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
