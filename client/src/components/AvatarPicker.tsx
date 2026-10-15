import { useMemo, useState } from 'react';
import { CHARACTERS, PERSONA_GROUPS, PersonaGroup, seedForCharacter } from '../lib/characters';
import { PersonaPortrait } from './AvatarBadge';

interface AvatarPickerProps {
  value: string;
  onChange: (seed: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [group, setGroup] = useState<PersonaGroup | 'all'>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHARACTERS.filter(
      (c) => (group === 'all' || c.group === group) && (!q || c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q))
    );
  }, [group, query]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {[{ id: 'all' as const, label: 'All' }, ...PERSONA_GROUPS].map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGroup(g.id)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              group === g.id ? 'bg-gold text-ink-950 border-gold font-semibold' : 'bg-ink-800 border-white/10 text-slate-300 hover:bg-ink-700'
            }`}
          >
            {g.label}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="ml-auto w-28 sm:w-36 bg-ink-800 border border-white/10 rounded-full px-3 py-1 text-xs text-slate-100 outline-none focus:border-gold/60"
        />
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-1 -m-1">
        {list.map((c) => {
          const seed = seedForCharacter(c.id);
          const selected = seed === value;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(seed)}
              title={`${c.name} — ${c.title}`}
              className={`group flex flex-col items-center gap-1 rounded-xl p-1.5 border transition-all ${
                selected ? 'border-gold bg-gold/15 shadow-glow' : 'border-transparent hover:bg-white/5'
              }`}
            >
              <span
                className="block w-full aspect-square rounded-full overflow-hidden"
                style={{ boxShadow: `0 0 0 2px ${selected ? '#e3b64f' : c.ring}` }}
              >
                <PersonaPortrait seed={seed} size={64} />
              </span>
              <span className={`text-[10px] leading-tight text-center line-clamp-2 ${selected ? 'text-gold-light font-semibold' : 'text-slate-300'}`}>
                {c.name}
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-full text-center text-xs text-slate-500 py-6">No match.</p>}
      </div>
    </div>
  );
}

/** Attribution list required by the Creative Commons licences of the persona photos. */
export function PersonaCredits({ onClose }: { onClose: () => void }) {
  const credited = CHARACTERS.filter((c) => c.credit);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ink-900 border border-white/10 rounded-2xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-gold-light">Persona photo credits</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            Close
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Character art and stills are from each franchise's fan wiki, used for private fan play; photos of real people are from
          Wikimedia Commons under their free licences. Fan-made personas — not affiliated with or endorsed by the rights holders
          of these characters or by the people pictured.
        </p>
        <ul className="space-y-1.5 text-xs">
          {credited.map((c) => (
            <li key={c.id} className="text-slate-300">
              <span className="font-semibold text-slate-100">{c.name}</span> — photo by {c.credit!.author || 'unknown'},{' '}
              <a href={c.credit!.source} target="_blank" rel="noreferrer" className="text-gold-light underline">
                {c.credit!.license}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
