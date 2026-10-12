import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

export const InfoNotice: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-xs text-slate-700 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">
              Understanding Website Page Counts & SEO Indexation
            </h4>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Why do Sitemap counts and Crawler counts often differ? Here is how to interpret the results.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 shrink-0 font-medium"
        >
          <span>{isExpanded ? 'Show less' : 'Learn more'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-600 leading-relaxed">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
            <h5 className="font-bold text-slate-900 mb-1 flex items-center space-x-1.5">
              <span>🗺️ Sitemap Count</span>
            </h5>
            <p className="text-[11px]">
              Lists the canonical URLs that webmasters explicitly submit to search engines via XML sitemaps. Sitemaps may include orphan pages not linked on the site, or exclude newly created or noindexed pages.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
            <h5 className="font-bold text-slate-900 mb-1 flex items-center space-x-1.5">
              <span>🕷️ Crawler Count</span>
            </h5>
            <p className="text-[11px]">
              Discovered by simulating a web spider starting from the homepage and following HTML hyperlinks (<code className="text-brand-700 bg-slate-100 px-1 py-0.5 rounded">&lt;a&gt;</code> tags). Crawlers only find pages that are actually linked within the website's structure.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-2xs">
            <h5 className="font-bold text-slate-900 mb-1 flex items-center space-x-1.5">
              <span>🔍 Google Indexing Note</span>
            </h5>
            <p className="text-[11px]">
              Discovered URLs do <strong>not</strong> guarantee Google indexing. Google uses proprietary algorithms, content quality filters, crawl budget, and canonical directives to determine which pages enter its public search index.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
