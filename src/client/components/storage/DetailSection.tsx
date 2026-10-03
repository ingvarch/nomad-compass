import { useId, type ReactNode } from 'react';

/**
 * Card with a heading; screen readers announce it as a region of that name.
 */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <h2 id={headingId} className="px-4 py-3 text-base font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Key and value pairs, or a note when there are none.
 */
export function KeyValueList({ values, empty }: { values: [string, string][]; empty: string }) {
  if (values.length === 0) {
    return <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
  }
  return (
    <dl className="divide-y divide-gray-100 dark:divide-gray-700/60">
      {values.map(([key, value], i) => (
        <div key={`${key}-${i}`} className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <dt className="font-mono text-gray-500 dark:text-gray-400">{key}</dt>
          <dd className="font-mono text-gray-900 dark:text-gray-100 break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
