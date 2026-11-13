import { useState, useMemo } from 'react';
import { gameApi } from '@/lib/api';
import type { PendingKolam } from '@/lib/types';
import { X, Sparkles } from 'lucide-react';

type GridCell = number;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateKolamGrid(seed: number): number[][] {
  const rng = seededRandom(seed);
  const size = 5;
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  const patterns = [
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
  ];

  const variant = Math.floor(rng() * 3);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (variant === 0) {
        grid[r][c] = patterns[r][c];
      } else if (variant === 1) {
        grid[r][c] = (r + c) % 2 === 0 ? 1 : 0;
      } else {
        grid[r][c] = patterns[c][r];
      }
    }
  }

  return grid;
}

function generateTileOptions(grid: number[][], correctTile: number): { grid: number[][]; label: string }[] {
  const tiles: { grid: number[][]; label: string }[] = [];
  const labels = ['A', 'B', 'C', 'D'];

  const correct = JSON.parse(JSON.stringify(grid));
  tiles[correctTile] = { grid: correct, label: labels[correctTile] };

  const rng = seededRandom((grid[0][0] + 1) * 7777);
  for (let i = 0; i < 4; i++) {
    if (i === correctTile) continue;
    const wrong = JSON.parse(JSON.stringify(grid));
    const r = Math.floor(rng() * 5);
    const c = Math.floor(rng() * 5);
    wrong[r][c] = wrong[r][c] === 1 ? 0 : 1;
    if (5 - 1 - r >= 0) {
      wrong[5 - 1 - r][c] = wrong[5 - 1 - r][c] === 1 ? 0 : 1;
    }
    tiles[i] = { grid: wrong, label: labels[i] };
  }

  return tiles;
}

function KolamGrid({ grid, size = 60 }: { grid: number[][]; size?: number }) {
  const rows = grid.length;
  const cols = grid[0].length;
  const cellSize = size / cols;

  return (
    <svg viewBox={`0 0 ${cols * 10} ${rows * 10}`} className="w-full h-auto">
      <defs>
        <radialGradient id="kolam-dot">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
      {grid.map((row, r) =>
        row.map((val, c) => (
          <g key={`${r}-${c}`}>
            <rect
              x={c * 10}
              y={r * 10}
              width={10}
              height={10}
              fill="#1a0a12"
              stroke="#3d1a2a"
              strokeWidth={0.3}
            />
            {val === 1 && (
              <circle
                cx={c * 10 + 5}
                cy={r * 10 + 5}
                r={3}
                fill="url(#kolam-dot)"
              />
            )}
            {val === 1 && (
              <>
                {c > 0 && grid[r][c - 1] === 1 && (
                  <line x1={c * 10} y1={r * 10 + 5} x2={c * 10 + 5} y2={r * 10 + 5} stroke="#f59e0b" strokeWidth={1} />
                )}
                {c < cols - 1 && grid[r][c + 1] === 1 && (
                  <line x1={c * 10 + 5} y1={r * 10 + 5} x2={c * 10 + 10} y2={r * 10 + 5} stroke="#f59e0b" strokeWidth={1} />
                )}
                {r > 0 && grid[r - 1][c] === 1 && (
                  <line x1={c * 10 + 5} y1={r * 10} x2={c * 10 + 5} y2={r * 10 + 5} stroke="#f59e0b" strokeWidth={1} />
                )}
                {r < rows - 1 && grid[r + 1][c] === 1 && (
                  <line x1={c * 10 + 5} y1={r * 10 + 5} x2={c * 10 + 5} y2={r * 10 + 10} stroke="#f59e0b" strokeWidth={1} />
                )}
              </>
            )}
          </g>
        ))
      )}
    </svg>
  );
}

export function KolamPuzzle({
  teamId,
  sessionToken,
  pendingKolam,
  onSolved,
}: {
  teamId: string;
  sessionToken: string;
  pendingKolam: PendingKolam;
  onSolved: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [solving, setSolving] = useState(false);
  const [result, setResult] = useState<{ solved: boolean; correctTile?: number } | null>(null);

  const fullGrid = useMemo(() => generateKolamGrid(pendingKolam.pattern_seed), [pendingKolam.pattern_seed]);
  const options = useMemo(
    () => generateTileOptions(fullGrid, pendingKolam.correct_tile),
    [fullGrid, pendingKolam.correct_tile]
  );

  async function handleSubmit() {
    if (selected === null) return;
    setSolving(true);
    setResult(null);
    try {
      const res = await gameApi.solveKolam(teamId, selected, sessionToken);
      if (res.solved) {
        setResult({ solved: true });
        setTimeout(() => onSolved(), 1200);
      } else {
        setResult({ solved: false, correctTile: res.correctTile });
      }
    } catch (err) {
      setResult({ solved: false });
    }
    setSolving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-maroon-950/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md festive-card p-6 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-flame-400 via-marigold-500 to-maroon-600 mb-3 border-2 border-gold-300/30">
            <Sparkles className="w-8 h-8 text-gold-200 animate-flame-flicker" />
          </div>
          <h2 className="text-xl font-display font-bold text-gold-100">Kolam Puzzle</h2>
          <p className="text-gold-200/70 text-sm mt-1">
            {pendingKolam.attacker_team_name} trapped you! Solve the symmetrical Kolam pattern to roll again.
          </p>
        </div>

        <div className="bg-maroon-950/60 rounded-xl p-3 border border-gold-500/20 mb-4">
          <p className="text-gold-300/80 text-xs font-semibold uppercase tracking-wider mb-2 text-center">
            Complete Symmetry
          </p>
          <div className="w-32 mx-auto">
            <KolamGrid grid={fullGrid} size={128} />
          </div>
        </div>

        <p className="text-gold-200/80 text-sm text-center mb-3">
          Which tile maintains the symmetrical pattern?
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              disabled={solving}
              className={`rounded-xl p-2 border-2 transition active:scale-95 ${
                selected === i
                  ? 'border-gold-400 bg-gold-400/15'
                  : result && !result.solved && result.correctTile === i
                  ? 'border-jewel-400 bg-jewel-400/15'
                  : 'border-gold-500/20 bg-maroon-950/40 hover:border-gold-500/40'
              }`}
            >
              <div className="w-full">
                <KolamGrid grid={opt.grid} size={100} />
              </div>
              <p className="text-gold-200 font-display font-bold text-sm mt-1">{opt.label}</p>
            </button>
          ))}
        </div>

        {result && (
          <div className={`rounded-xl px-4 py-2 text-sm text-center mb-3 ${result.solved ? 'bg-jewel-900/40 text-jewel-300' : 'bg-marigold-900/40 text-marigold-300'}`}>
            {result.solved ? 'Solved! The Kolam glows — you can roll again.' : 'Not quite! The correct tile is highlighted. Try again.'}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={selected === null || solving || (result?.solved ?? false)}
          className="btn-primary w-full"
        >
          {solving ? 'Checking…' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
