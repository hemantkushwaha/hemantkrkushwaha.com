/**
 * Academic Resource Card Component
 * 
 * Hemant Kumar Kushwaha Knowledge Platform (hemantkrkushwaha.com)
 * Architecture: Step 26 — Live Academic Navigation Slice
 * 
 * Displays one of the four syllabus resources:
 * - Study Material
 * - PPT
 * - Interactive App
 * - Question Bank
 * 
 * Invariants:
 * - Each card displays: "Resource not connected yet"
 * - ZERO fake URLs
 * - ZERO placeholder Google Drive links
 * - ZERO simulated content
 */

import { BookOpen, Presentation, SlidersHorizontal, HelpCircle, Clock } from 'lucide-react';
import { Card } from '../common/Card';
import { AcademicResource, AcademicResourceType } from '../../types/academicNavigation';

interface ResourceCardProps {
  resource: AcademicResource;
}

function getResourceIcon(type: AcademicResourceType) {
  switch (type) {
    case 'study_material':
      return BookOpen;
    case 'ppt':
      return Presentation;
    case 'interactive_app':
      return SlidersHorizontal;
    case 'question_bank':
      return HelpCircle;
    default:
      return BookOpen;
  }
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const Icon = getResourceIcon(resource.type);

  return (
    <article id={`resource-card-${resource.id}`} className="h-full flex flex-col">
      <Card className="h-full flex flex-col justify-between border-stone-200/90 bg-white p-6 sm:p-7 transition-colors">
        <div className="space-y-4">
          {/* Card Top: Icon & Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
              <Icon className="w-5 h-5 text-stone-700" aria-hidden="true" />
            </div>
            <span
              id={`status-badge-${resource.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-amber-50 text-amber-900 border border-amber-200/70"
            >
              <Clock className="w-3 h-3 text-amber-700 shrink-0" aria-hidden="true" />
              <span>{resource.statusMessage}</span>
            </span>
          </div>

          {/* Title & Description */}
          <div className="space-y-2 pt-1">
            <h3
              id={`resource-title-${resource.id}`}
              className="font-serif text-xl sm:text-2xl font-medium text-stone-950"
            >
              {resource.title}
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              {resource.description}
            </p>
          </div>
        </div>

        {/* Action Boundary: Explicitly unconnected, zero fake URLs */}
        <div className="pt-6 mt-6 border-t border-stone-100">
          <div
            id={`resource-status-box-${resource.id}`}
            className="flex items-center justify-between rounded-lg bg-stone-50 px-3.5 py-2.5 border border-stone-200/60 text-xs text-stone-600"
          >
            <span className="font-medium text-stone-700">
              Status
            </span>
            <span className="font-mono text-amber-800 font-medium">
              Resource not connected yet
            </span>
          </div>
        </div>
      </Card>
    </article>
  );
}
