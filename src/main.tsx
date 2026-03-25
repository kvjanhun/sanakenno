import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useHashRoute } from './hooks/useHashRoute.js';
import App from './App';
import { AdminLayout } from './components/admin/AdminLayout.js';
import './styles/index.css';

if (import.meta.env.DEV) {
  import('./dev.js').then((m) => m.installDevHelpers());
}

/**
 * Root component with hash-based routing.
 * '#/admin' renders the admin panel, everything else renders the game.
 */
function Root() {
  const route = useHashRoute();

  if (route === 'admin') {
    return <AdminLayout />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
