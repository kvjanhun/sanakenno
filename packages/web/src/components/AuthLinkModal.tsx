/**
 * Interstitial shown when the page is opened with a magic link token.
 *
 * Lets the player choose whether to log in on the web or open the native app.
 * The token is not consumed until one of the two actions is taken, so
 * whichever path the player picks gets the single-use token.
 *
 * @module src/components/AuthLinkModal
 */

interface AuthLinkModalProps {
  token: string;
  onLoginWeb: () => void;
}

export function AuthLinkModal({ token, onLoginWeb }: AuthLinkModalProps) {
  const appUrl = `sanakenno://auth?token=${encodeURIComponent(token)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Kirjaudu sisään
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Haluatko kirjautua selaimessa vai avata Sanakenno-sovelluksen?
        </p>

        <a
          href={appUrl}
          className="block w-full py-3 rounded-lg text-center font-semibold text-sm no-underline"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#fff',
          }}
        >
          Avaa sovelluksessa
        </a>

        <button
          type="button"
          onClick={onLoginWeb}
          className="w-full py-3 rounded-lg text-sm font-medium bg-transparent border cursor-pointer"
          style={{
            borderColor: 'var(--color-text-tertiary)',
            color: 'var(--color-text-primary)',
          }}
        >
          Kirjaudu selaimessa
        </button>
      </div>
    </div>
  );
}
