/**
 * Academic Question & Solution Card Component
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 27 — Add Question and Solution to Academic Knowledge Platform
 * 
 * Displays an academic problem with its complete, rigorous solution:
 * - Clear question presentation
 * - Directed graph edges & interactive/visual diagram
 * - Clear mathematical formula & walk algebra
 * - Zero-weight cycle analysis & infinite walk derivation
 * - Preserves existing site aesthetic (Stone color palette, serif headings, clean typography)
 * - Zero assessment forms, zero fake URLs, zero AI generation
 */

import React from 'react';
import { HelpCircle, CheckCircle2, ArrowRight, Share2, Sparkles, Layers } from 'lucide-react';
import { AcademicQuestionItem } from '../../types/academicNavigation';

interface AcademicQuestionCardProps {
  questionItem: AcademicQuestionItem;
  subjectTitle?: string;
  topicTitle?: string;
}

export function AcademicQuestionCard({
  questionItem,
  subjectTitle,
  topicTitle,
}: AcademicQuestionCardProps) {
  return (
    <article
      id={`question-card-${questionItem.slug}`}
      className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden transition-all"
    >
      {/* Header Bar */}
      <div className="border-b border-stone-200/80 bg-stone-50/70 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-stone-200/80 text-stone-800 border border-stone-300/70">
            <HelpCircle className="w-3.5 h-3.5 text-stone-700" aria-hidden="true" />
            Solved Problem
          </span>
          {topicTitle && (
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">
              &bull; {topicTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {questionItem.tags?.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-2xs font-mono bg-stone-100 text-stone-600 border border-stone-200/60"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Title */}
        <div>
          <h3
            id={`question-title-${questionItem.slug}`}
            className="font-serif text-2xl sm:text-3xl font-medium text-stone-950 tracking-tight"
          >
            {questionItem.title}
          </h3>
          {subjectTitle && (
            <p className="text-xs text-stone-500 uppercase tracking-wider font-mono mt-1">
              Curriculum: {subjectTitle}
            </p>
          )}
        </div>

        {/* 1. QUESTION SECTION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-600 font-medium">
            <span className="w-6 h-6 rounded bg-stone-100 flex items-center justify-center text-stone-800 font-bold">
              Q
            </span>
            <span>Problem Statement</span>
          </div>

          <div
            id="question-statement-box"
            className="p-5 sm:p-6 rounded-xl bg-stone-50/90 border border-stone-200/90 text-stone-900 font-serif text-base sm:text-lg leading-relaxed shadow-2xs"
          >
            <p className="font-medium text-stone-900">
              {questionItem.question}
            </p>
          </div>

          {/* Directed Graph Edges & Visual Representation */}
          {questionItem.graphEdges && questionItem.graphEdges.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
                  Directed Graph Specification &amp; Edge Weights
                </span>
                <span className="text-2xs font-mono text-stone-400">
                  {questionItem.graphEdges.length} Directed Edges
                </span>
              </div>

              {/* Edge Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {questionItem.graphEdges.map((edge, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 border border-stone-200/80 font-mono text-xs"
                  >
                    <span className="font-semibold text-stone-900">
                      {edge.from} &rarr; {edge.to}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white font-bold text-stone-800 border border-stone-200 shadow-2xs">
                      wt: {edge.weight}
                    </span>
                  </div>
                ))}
              </div>

              {/* Visual SVG Diagram of the Directed Graph */}
              <div className="p-4 sm:p-6 rounded-lg bg-stone-50/50 border border-stone-200/70 flex flex-col items-center justify-center">
                <svg
                  viewBox="0 0 540 160"
                  className="w-full max-w-xl h-auto"
                  aria-label="Directed graph diagram with vertices S, A, B, T and edge weights"
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#44403c" />
                    </marker>
                    <marker
                      id="arrow-cycle"
                      viewBox="0 0 10 10"
                      refX="9"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#047857" />
                    </marker>
                  </defs>

                  {/* Edge S -> A (weight 1) */}
                  <line
                    x1="80"
                    y1="80"
                    x2="178"
                    y2="80"
                    stroke="#44403c"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow)"
                  />
                  <rect x="115" y="58" width="34" height="20" rx="4" fill="#ffffff" stroke="#d6d3d1" />
                  <text x="132" y="73" textAnchor="middle" fontSize="12" fontFamily="monospace" fontWeight="bold" fill="#1c1917">
                    1
                  </text>

                  {/* Edge A -> B top curve (weight 0) */}
                  <path
                    d="M 220 70 C 260 40, 280 40, 320 70"
                    fill="none"
                    stroke="#047857"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-cycle)"
                  />
                  <rect x="255" y="32" width="34" height="20" rx="4" fill="#ffffff" stroke="#a7f3d0" />
                  <text x="272" y="46" textAnchor="middle" fontSize="12" fontFamily="monospace" fontWeight="bold" fill="#065f46">
                    0
                  </text>

                  {/* Edge B -> A bottom curve (weight 0) - Cycle */}
                  <path
                    d="M 320 90 C 280 120, 260 120, 220 90"
                    fill="none"
                    stroke="#047857"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-cycle)"
                  />
                  <rect x="255" y="108" width="34" height="20" rx="4" fill="#ffffff" stroke="#a7f3d0" />
                  <text x="272" y="122" textAnchor="middle" fontSize="12" fontFamily="monospace" fontWeight="bold" fill="#065f46">
                    0
                  </text>

                  {/* Edge B -> T (weight 1) */}
                  <line
                    x1="360"
                    y1="80"
                    x2="458"
                    y2="80"
                    stroke="#44403c"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow)"
                  />
                  <rect x="395" y="58" width="34" height="20" rx="4" fill="#ffffff" stroke="#d6d3d1" />
                  <text x="412" y="73" textAnchor="middle" fontSize="12" fontFamily="monospace" fontWeight="bold" fill="#1c1917">
                    1
                  </text>

                  {/* Vertex S */}
                  <circle cx="60" cy="80" r="22" fill="#1c1917" stroke="#0c0a09" strokeWidth="2" />
                  <text x="60" y="86" textAnchor="middle" fontSize="16" fontFamily="sans-serif" fontWeight="bold" fill="#ffffff">
                    S
                  </text>

                  {/* Vertex A */}
                  <circle cx="200" cy="80" r="22" fill="#f5f5f4" stroke="#44403c" strokeWidth="2" />
                  <text x="200" y="86" textAnchor="middle" fontSize="16" fontFamily="sans-serif" fontWeight="bold" fill="#1c1917">
                    A
                  </text>

                  {/* Vertex B */}
                  <circle cx="340" cy="80" r="22" fill="#f5f5f4" stroke="#44403c" strokeWidth="2" />
                  <text x="340" y="86" textAnchor="middle" fontSize="16" fontFamily="sans-serif" fontWeight="bold" fill="#1c1917">
                    B
                  </text>

                  {/* Vertex T */}
                  <circle cx="480" cy="80" r="22" fill="#1c1917" stroke="#0c0a09" strokeWidth="2" />
                  <text x="480" y="86" textAnchor="middle" fontSize="16" fontFamily="sans-serif" fontWeight="bold" fill="#ffffff">
                    T
                  </text>
                </svg>

                <p className="text-2xs font-mono text-emerald-800 text-center mt-2">
                  Highlighted in green: Zero-weight cycle A &harr; B with weight 0 + 0 = 0
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2. SOLUTION / ANSWER SECTION */}
        <div className="space-y-6 pt-4 border-t border-stone-200">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
            <span className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-900 font-bold">
              A
            </span>
            <span>Complete Academic Solution</span>
          </div>

          {/* Key Conclusions Callout */}
          <div
            id="key-conclusions-box"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950"
          >
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                Shortest S &rarr; T Distance
              </span>
              <p className="font-serif text-3xl font-bold text-emerald-950">
                2
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                Number of Shortest Walks
              </span>
              <p className="font-serif text-2xl font-bold text-emerald-950">
                Countably infinite
              </p>
            </div>
          </div>

          {/* Step-by-Step Derivation and Explanation */}
          <div className="space-y-5 text-stone-800 leading-relaxed font-serif text-base sm:text-lg">
            <div className="space-y-3">
              <h4 className="font-sans font-semibold text-sm uppercase tracking-wider text-stone-700">
                Step-by-Step Walk Analysis
              </h4>
              <p>
                Every walk from vertex <strong className="font-mono font-semibold text-stone-900">S</strong> to vertex <strong className="font-mono font-semibold text-stone-900">T</strong> must initiate along the edge <span className="font-mono font-medium bg-stone-100 px-1.5 py-0.5 rounded text-stone-900">S &rarr; A</span> (weight 1), proceed along <span className="font-mono font-medium bg-stone-100 px-1.5 py-0.5 rounded text-stone-900">A &rarr; B</span> (weight 0), and must eventually exit to the terminal vertex via <span className="font-mono font-medium bg-stone-100 px-1.5 py-0.5 rounded text-stone-900">B &rarr; T</span> (weight 1).
              </p>
              <p>
                Between reaching vertex <strong className="font-mono font-semibold text-stone-900">B</strong> and finally taking <span className="font-mono font-medium bg-stone-100 px-1.5 py-0.5 rounded text-stone-900">B &rarr; T</span>, the walk may traverse the directed cycle <span className="font-mono font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-2 py-0.5 rounded">B &rarr; A &rarr; B</span> any arbitrary number <span className="font-mono font-semibold">k &ge; 0</span> of times.
              </p>
            </div>

            {/* Mathematical Formula Display */}
            <div
              id="math-weight-formula-box"
              className="my-5 p-5 sm:p-6 rounded-xl bg-stone-900 text-stone-100 shadow-inner"
            >
              <span className="text-xs font-mono uppercase tracking-wider text-stone-400 block pb-2">
                Total Walk Weight Calculation:
              </span>
              <div className="font-mono text-lg sm:text-2xl font-bold text-amber-300 text-center py-2 tracking-wide">
                1 + 0 + k(0 + 0) + 1 = 2
              </div>
              <p className="text-xs font-mono text-stone-400 text-center pt-2">
                Where k &isin; &#8469;&#8320; = &#123;0, 1, 2, 3, &hellip;&#125;
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-sans font-semibold text-sm uppercase tracking-wider text-stone-700">
                Cycle Weight &amp; Countability Invariant
              </h4>
              <p>
                Because the cycle <span className="font-mono font-semibold">B &rarr; A &rarr; B</span> has a cumulative weight of <span className="font-mono font-semibold text-emerald-800">0 + 0 = 0</span>, traversing this cycle does not alter or increase the total walk weight.
              </p>
              <p>
                Every non-negative integer <span className="font-mono font-semibold">k</span> produces a strictly distinct valid graph walk with identical total weight <span className="font-mono font-bold text-stone-950">2</span>:
              </p>

              {/* Sample of Distinct Shortest Walks */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 font-mono text-xs sm:text-sm space-y-1.5 text-stone-800">
                <div>&bull; <span className="text-stone-500">k = 0:</span> S &rarr; A &rarr; B &rarr; T <span className="text-emerald-700 font-semibold">(Length: 3 edges, Weight: 2)</span></div>
                <div>&bull; <span className="text-stone-500">k = 1:</span> S &rarr; A &rarr; B &rarr; A &rarr; B &rarr; T <span className="text-emerald-700 font-semibold">(Length: 5 edges, Weight: 2)</span></div>
                <div>&bull; <span className="text-stone-500">k = 2:</span> S &rarr; A &rarr; B &rarr; A &rarr; B &rarr; A &rarr; B &rarr; T <span className="text-emerald-700 font-semibold">(Length: 7 edges, Weight: 2)</span></div>
                <div>&bull; <span className="text-stone-500">k &isin; &#8469;&#8320;:</span> S &rarr; A &rarr; B &rarr; (A &rarr; B)<sup>k</sup> &rarr; T <span className="text-emerald-700 font-semibold">(Length: 2k + 3 edges, Weight: 2)</span></div>
              </div>
            </div>

            {/* Formal Conclusion Summary */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2 text-sm text-stone-800">
              <p className="font-sans font-semibold text-stone-900">
                Formal Academic Conclusion:
              </p>
              <ul className="list-disc list-inside space-y-1 font-sans text-stone-700">
                <li>
                  <strong>Shortest S &rarr; T distance:</strong> 2
                </li>
                <li>
                  <strong>Number of shortest walks:</strong> Countably infinite (in bijective correspondence with the non-negative integers &#8469;&#8320;).
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
