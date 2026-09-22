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

import { BookOpen, Presentation, SlidersHorizontal, HelpCircle, Clock, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import { Card } from '../common/Card';
import { AcademicResource, AcademicResourceType } from '../../types/academicNavigation';

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

interface ResourceCardProps {
  resource: AcademicResource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const Icon = getResourceIcon(resource.type);
  const isConnected = resource.status === 'connected';

  return (
    <article id={`resource-card-${resource.id}`} className="h-full flex flex-col">
      <Card className="h-full flex flex-col justify-between border-stone-200/90 bg-white p-6 sm:p-7 transition-colors">
        <div className="space-y-4">
          {/* Card Top: Icon & Status */}
          <div className="flex items-start justify-between gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isConnected ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-700'
            }`}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <span
              id={`status-badge-${resource.id}`}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-900 border border-amber-200/70'
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <Clock className="w-3 h-3 text-amber-700 shrink-0" aria-hidden="true" />
              )}
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

          {/* Connected Resource Metadata if available */}
          {isConnected && resource.source && (
            <div className="pt-2 text-xs text-stone-500 space-y-1">
              <div className="flex items-center gap-1.5 text-stone-700 font-mono">
                <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{resource.source.source_name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Boundary: Real connection indicator or unconnected status */}
        <div className="pt-6 mt-6 border-t border-stone-100 space-y-3">
          <div
            id={`resource-status-box-${resource.id}`}
            className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 border text-xs ${
              isConnected
                ? 'bg-emerald-50/60 border-emerald-200/70 text-emerald-900'
                : 'bg-stone-50 border-stone-200/60 text-stone-600'
            }`}
          >
            <span className="font-medium text-stone-700">
              Status
            </span>
            <span
              id={`resource-status-text-${resource.id}`}
              className={`font-mono font-medium ${
                isConnected ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {resource.statusMessage}
            </span>
          </div>

          {isConnected && resource.source?.web_view_link && (
            <a
              id={`resource-link-${resource.id}`}
              href={resource.source.web_view_link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900 text-stone-50 hover:bg-stone-800 active:bg-stone-950 font-medium text-sm transition-colors shadow-xs"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="w-4 h-4 text-stone-400" aria-hidden="true" />
            </a>
          )}
        </div>
      </Card>
    </article>
  );
}
