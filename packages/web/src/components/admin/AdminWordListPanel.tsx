import { Search } from 'lucide-react';
import { WordList } from './WordList';

/** Framed word-list panel for the active admin puzzle or preview. */
export function AdminWordListPanel({
  words,
  letters,
  loading,
  onBlock,
}: {
  words: string[];
  letters: string;
  loading: boolean;
  onBlock: (word: string) => void;
}) {
  return (
    <section
      className="rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1 lg:h-full lg:overflow-hidden lg:min-h-0"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="flex items-center gap-3 p-5 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
          <Search size={18} />
        </span>
        <div>
          <h2
            className="text-md font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sanalista
          </h2>
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Pelin kaikki sallitut sanat. Vie hiiri sanan päälle ja paina
            roskakoria estääksesi sen pysyvästi.
          </p>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto min-h-0 lg:max-h-full">
        <WordList
          words={words}
          letters={letters}
          loading={loading}
          onBlock={onBlock}
        />
      </div>
    </section>
  );
}
