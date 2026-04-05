/**
 * Admin login page.
 *
 * Simple form with username/password fields and Finnish labels.
 * Calls the admin store's login action on submit.
 *
 * @module src/components/admin/LoginPage
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAdminStore } from '../../store/useAdminStore';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAdminStore((s) => s.login);
  const loginLoading = useAdminStore((s) => s.loginLoading);
  const loginError = useAdminStore((s) => s.loginError);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs p-6 rounded-lg"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h1
          className="text-xl font-semibold mb-6 text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Sanakenno Admin
        </h1>

        {loginError && (
          <div
            className="mb-4 p-2 rounded text-sm text-center"
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: '#dc2626',
            }}
          >
            {loginError}
          </div>
        )}

        <label
          className="block text-sm mb-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Käyttäjänimi
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="w-full mb-4 p-2 rounded text-sm"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />

        <label
          className="block text-sm mb-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Salasana
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full mb-6 p-2 rounded text-sm"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />

        <button
          type="submit"
          disabled={loginLoading || !username || !password}
          className="w-full p-2 rounded text-sm font-semibold cursor-pointer"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            opacity: loginLoading ? 0.6 : 1,
          }}
        >
          {loginLoading ? 'Kirjaudutaan...' : 'Kirjaudu'}
        </button>
      </form>
    </div>
  );
}
