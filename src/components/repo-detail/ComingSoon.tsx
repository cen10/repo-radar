import { ChartBarIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';

export function ComingSoon() {
  return (
    <div className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
        <SparklesIcon className="h-5 w-5" aria-hidden="true" />
        Coming Soon
      </h2>
      <ul className="space-y-3 text-sm text-indigo-800">
        <li className="flex items-start gap-2">
          <ChartBarIcon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Historical star tracking</strong> — Sparklines showing star growth over the past
            30 days
          </span>
        </li>
        <li className="flex items-start gap-2">
          <ClockIcon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Trend analysis</strong> — 7-day and 30-day growth rates with visual indicators
          </span>
        </li>
      </ul>
    </div>
  );
}
