/**
 * Admin layout shell with authentication gate and tab navigation.
 *
 * Checks session on mount. If not authenticated, renders LoginPage.
 * Once authenticated, provides tabbed access to the admin tools.
 *
 * @module src/components/admin/AdminLayout
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Ban,
  BarChart3,
  CalendarDays,
  Search,
  LayoutDashboard,
  LogOut,
  PanelTop,
  X,
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { useAdminThemeStore } from '../../store/useAdminThemeStore';
import { ThemeSelector } from '../ThemeSelector';
import { ThemeToggle } from '../ThemeToggle';
import { LoginPage } from './LoginPage';
import { PuzzleEditor } from './PuzzleEditor';
import { BlockedWords } from './BlockedWords';
import { Schedule } from './Schedule';
import { Stats } from './Stats';
import { SuggestionRejections } from './SuggestionRejections';
import { WordData } from './WordData';

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

type Tab = 'editor' | 'rejected' | 'blocked' | 'schedule' | 'stats' | 'words';

const TABS: {
  key: Tab;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    key: 'editor',
    label: 'Pelit',
    description: 'Muokkaus ja ehdotukset',
    icon: LayoutDashboard,
  },
  {
    key: 'rejected',
    label: 'Hylätyt',
    description: 'Ehdotusjono',
    icon: PanelTop,
  },
  {
    key: 'blocked',
    label: 'Estot',
    description: 'Sanat',
    icon: Ban,
  },
  {
    key: 'schedule',
    label: 'Aikataulu',
    description: 'Kierto',
    icon: CalendarDays,
  },
  {
    key: 'stats',
    label: 'Tilastot',
    description: 'Pelaaminen',
    icon: BarChart3,
  },
  {
    key: 'words',
    label: 'Sanadata',
    description: 'Virheet ja löydöt',
    icon: Search,
  },
];

export function AdminLayout() {
  const authenticated = useAdminStore((s) => s.authenticated);
  const username = useAdminStore((s) => s.username);
  const checkSession = useAdminStore((s) => s.checkSession);
  const logout = useAdminStore((s) => s.logout);
  const totalPuzzles = useAdminStore((s) => s.totalPuzzles);
  const statusMessage = useAdminStore((s) => s.statusMessage);
  const statusType = useAdminStore((s) => s.statusType);
  const setStatusMessage = useAdminStore((s) => s.setStatusMessage);

  const adminThemeId = useAdminThemeStore((s) => s.themeId);
  const adminPreference = useAdminThemeStore((s) => s.preference);
  const setAdminThemeId = useAdminThemeStore((s) => s.setThemeId);
  const setAdminPreference = useAdminThemeStore((s) => s.setPreference);

  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('editor');

  // Manage body/html classes/attributes for the admin theme while mounted.
  useEffect(() => {
    // Read previous values to restore on unmount.
    const oldPalette = document.documentElement.getAttribute('data-palette');
    const oldTheme = document.documentElement.getAttribute('data-theme');

    // Apply admin values
    document.documentElement.setAttribute('data-palette', adminThemeId);
    if (adminPreference === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', adminPreference);
    }

    return () => {
      // Restore previous values
      if (oldPalette) {
        document.documentElement.setAttribute('data-palette', oldPalette);
      } else {
        document.documentElement.removeAttribute('data-palette');
      }
      if (oldTheme) {
        document.documentElement.setAttribute('data-theme', oldTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };
  }, [adminThemeId, adminPreference]);

  // Clear status message after 3.5 seconds
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [statusMessage, setStatusMessage]);

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
        const todayEntry = data.schedule?.find(
          (e: { is_today: boolean }) => e.is_today,
        );
        useAdminStore.setState({
          totalPuzzles: data.total_puzzles,
          ...(todayEntry ? { currentSlot: todayEntry.slot } : {}),
        });
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
      <header
        className="sticky top-0 z-50"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 lg:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-on-accent)',
                  }}
                  aria-hidden="true"
                >
                  <PanelTop size={17} strokeWidth={2.4} />
                </span>
                <div className="min-w-0">
                  <h1
                    className="truncate text-base font-semibold leading-tight"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Sanakenno Admin
                  </h1>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {totalPuzzles} peliä kierrossa
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <ThemeSelector
                themeId={adminThemeId}
                setThemeId={setAdminThemeId}
                preference={adminPreference}
              />
              <ThemeToggle
                preference={adminPreference}
                setPreference={setAdminPreference}
              />
              <span
                className="truncate text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Kirjaudu ulos"
                className="inline-flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <LogOut size={15} strokeWidth={2.2} aria-hidden="true" />
                Kirjaudu ulos
              </button>
            </div>
          </div>

          <nav
            aria-label="Admin-osiot"
            className="flex gap-1 overflow-x-auto rounded p-0.5"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.description}
                  className="flex h-8 min-w-[6.5rem] items-center gap-2 rounded px-2 text-left cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-bg-primary)'
                      : 'transparent',
                    border: active
                      ? '1px solid var(--color-border)'
                      : '1px solid transparent',
                    color: active
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-secondary)',
                    boxShadow: active
                      ? '0 1px 2px color-mix(in srgb, var(--color-text-primary) 8%, transparent)'
                      : 'none',
                  }}
                >
                  <Icon
                    size={17}
                    strokeWidth={2.1}
                    aria-hidden="true"
                    style={{
                      color: active
                        ? 'var(--color-accent)'
                        : 'var(--color-text-tertiary)',
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {tab.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-1.5 lg:px-6">
        <div hidden={activeTab !== 'editor'}>
          <PuzzleEditor />
        </div>
        {activeTab === 'rejected' && <SuggestionRejections />}
        {activeTab === 'blocked' && <BlockedWords />}
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'stats' && <Stats />}
        {activeTab === 'words' && <WordData />}
      </main>

      {/* Central Floating Toast Notification System */}
      {statusMessage && (
        <div
          role="alert"
          className="fixed top-6 right-6 z-[9999] max-w-sm w-full md:w-85 p-4 rounded-xl border flex items-start gap-3 shadow-xl animate-fade-in pointer-events-auto"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor:
                statusType === 'error'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : statusType === 'warning'
                    ? 'rgba(245, 158, 11, 0.1)'
                    : 'rgba(34, 197, 94, 0.1)',
              color:
                statusType === 'error'
                  ? 'rgb(239, 68, 68)'
                  : statusType === 'warning'
                    ? 'rgb(245, 158, 11)'
                    : 'rgb(34, 197, 94)',
            }}
          >
            {statusType === 'error'
              ? '!'
              : statusType === 'warning'
                ? '?'
                : '✓'}
          </div>
          <div
            className="flex-1 text-sm font-semibold leading-snug"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {statusMessage}
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer shrink-0 mt-0.5"
            aria-label="Sulje"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
