import type { CombinationEntry } from '../../store/useAdminStore';

/** Scrollable combination results table with sortable columns. */
export function CombinationResultsTable({
  comboLoading,
  comboResults,
  selectedCombo,
  savedLetters,
  onSelectCombo,
  onSort,
  sortIndicator,
}: {
  comboLoading: boolean;
  comboResults: CombinationEntry[];
  selectedCombo: string | null;
  savedLetters: string;
  onSelectCombo: (combo: CombinationEntry) => void;
  onSort: (column: string) => void;
  sortIndicator: (column: string) => string;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden mt-4 shadow-sm"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
        <table
          className="w-full text-xs"
          style={{ borderCollapse: 'collapse' }}
        >
          <thead
            className="sticky top-0 z-10"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <tr style={{ color: 'var(--color-text-secondary)' }}>
              <th
                className="text-left py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                onClick={() => onSort('letters')}
              >
                Kirjaimet{sortIndicator('letters')}
              </th>
              <th
                className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                onClick={() => onSort('pangrams')}
              >
                Pg{sortIndicator('pangrams')}
              </th>
              <th
                className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                onClick={() => onSort('words_max')}
              >
                Max{sortIndicator('words_max')}
              </th>
              <th
                className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                onClick={() => onSort('words_min')}
              >
                Min{sortIndicator('words_min')}
              </th>
              <th
                className="text-right py-2 px-3 cursor-pointer hover:bg-neutral-800/20"
                onClick={() => onSort('score_max')}
              >
                Pisteet{sortIndicator('score_max')}
              </th>
            </tr>
          </thead>
          <tbody>
            {comboLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-[11px]"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Ladataan yhdistelmiä...
                </td>
              </tr>
            )}
            {!comboLoading && comboResults.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-[11px]"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Ei hakua vastaavia tuloksia.
                </td>
              </tr>
            )}
            {!comboLoading &&
              comboResults.map((combo) => (
                <tr
                  key={combo.letters}
                  className="cursor-pointer transition-colors"
                  onClick={() => onSelectCombo(combo)}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor:
                      selectedCombo === combo.letters
                        ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                        : combo.letters === savedLetters
                          ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)'
                          : 'transparent',
                  }}
                >
                  <td
                    className="py-2.5 px-3 font-mono font-semibold uppercase text-xs"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {combo.letters}
                    {combo.in_rotation && (
                      <span
                        className="ml-1.5 inline-block text-[10px] font-bold px-1 rounded bg-indigo-500/10"
                        style={{ color: 'var(--color-accent)' }}
                        title="On jo kiertoryhmässä"
                      >
                        *
                      </span>
                    )}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {combo.total_pangrams}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {combo.max_word_count}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {combo.min_word_count}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {combo.max_max_score}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
