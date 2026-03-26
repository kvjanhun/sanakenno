/**
 * Admin layout shell with authentication gate and tab navigation.
 *
 * Checks session on mount. If not authenticated, renders LoginPage.
 * Once authenticated, provides tabbed access to the admin tools.
 *
 * @module src/components/admin/AdminLayout
 */

import { useEffect, useState, useCallback } from 'react';
import { useAdminStore } from '../../store/useAdminStore.js';
import { LoginPage } from './LoginPage.js';
import { PuzzleEditor } from './PuzzleEditor.js';
import { BlockedWords } from './BlockedWords.js';
import { Schedule } from './Schedule.js';
import { Stats } from './Stats.js';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

type Tab = 'editor' | 'blocked' | 'schedule' | 'stats';

const TABS: { key: Tab; label: string }[] = [
  { key: 'editor', label: 'Työkalu' },
  { key: 'blocked', label: 'Estetyt' },
  { key: 'schedule', label: 'Aikataulu' },
  { key: 'stats', label: 'Tilastot' },
];

export function AdminLayout() {
  const authenticated = useAdminStore((s) => s.authenticated);
  const username = useAdminStore((s) => s.username);
  const checkSession = useAdminStore((s) => s.checkSession);
  const logout = useAdminStore((s) => s.logout);
  const totalPuzzles = useAdminStore((s) => s.totalPuzzles);

  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('editor');

  // Check session on mount
  useEffect(() => {
    checkSession().then(() => setChecking(false));
  }, [checkSession]);

  // Fetch total puzzles when authenticated
  const fetchTotal = useCallback(async () => {
    try {
      const csrfToken = useAdminStore.getState().csrfToken;
      const res = await fetch(`${API_BASE}/api/admin/schedule?days=1`, {
        credentials: 'same-origin',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      });
      if (res.ok) {
        const data = await res.json();
        useAdminStore.setState({ totalPuzzles: data.total_puzzles });
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchTotal();
    }
  }, [authenticated, fetchTotal]);

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div style={{ color: 'var(--color-text-tertiary)' }}>Ladataan...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  const handleLogout = () => {
    logout();
    window.location.hash = '';
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 h-12 flex justify-between items-center">
          <h1
            className="text-base font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sanakenno Admin
            <span
              className="ml-2 text-xs font-normal"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {totalPuzzles} peliä
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs px-2 py-1 rounded cursor-pointer"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Kirjaudu ulos
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-2 text-sm cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom:
                  activeTab === tab.key
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                color:
                  activeTab === tab.key
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        {activeTab === 'editor' && <PuzzleEditor />}
        {activeTab === 'blocked' && <BlockedWords />}
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'stats' && <Stats />}
      </main>
    </div>
  );
}
