/**
 * Admin word analytics page.
 *
 * Keeps failed-guess and successful-word analytics separate from usage
 * statistics while sharing a compact local tab surface.
 *
 * @module src/components/admin/WordData
 */

import { useState } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { FailedGuesses } from './FailedGuesses';
import { WordFinds } from './WordFinds';

type WordDataTab = 'failed' | 'words';

const TABS: {
  key: WordDataTab;
  label: string;
  icon: typeof BarChart3;
}[] = [
  { key: 'failed', label: 'Vieraat sanat', icon: BarChart3 },
  { key: 'words', label: 'Löydetyt sanat', icon: Search },
];

export function WordData() {
  const [activeTab, setActiveTab] = useState<WordDataTab>('failed');

  return (
    <section className="w-full" aria-label="Sanadata">
      <div
        className="rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex flex-wrap items-center gap-1 px-2 py-1.5"
          style={{
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="inline-flex h-7 items-center gap-2 rounded px-2 text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: active
                    ? 'var(--color-bg-primary)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                  border: active
                    ? '1px solid var(--color-border)'
                    : '1px solid transparent',
                }}
              >
                <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-2">
          {activeTab === 'failed' ? <FailedGuesses /> : <WordFinds />}
        </div>
      </div>
    </section>
  );
}
