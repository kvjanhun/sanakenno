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
    <section
      className="max-w-7xl mx-auto space-y-6 animate-fade-in"
      aria-label="Sanadata"
    >
      {/* Title & Stats Navigation */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center bg-[color-mix(in srgb,var(--color-accent)_8%,var(--color-bg-primary))]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <BarChart3 size={20} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h2
              className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Pelitilastot & Sanadata
            </h2>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Seuraa vääriä arvauksia ja tarkastele jokaisen pelipulman sanojen
              vaikeustasoja.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          className="inline-flex rounded-xl p-1 border bg-[var(--color-bg-primary)] h-10 items-center justify-start"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: active
                    ? 'var(--color-accent)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-on-accent)'
                    : 'var(--color-text-secondary)',
                }}
              >
                <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Panel Content container */}
      <div
        className="rounded-2xl border p-6 shadow-xs"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="transition-all duration-300">
          {activeTab === 'failed' ? <FailedGuesses /> : <WordFinds />}
        </div>
      </div>
    </section>
  );
}
