import { CHARACTERS, seedForCharacter } from '../lib/characters';

interface AvatarPickerProps {
  value: string;
  onChange: (seed: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
      {CHARACTERS.map((c) => {
        const seed = seedForCharacter(c.id);
        const selected = seed === value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(seed)}
            title={c.title}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-all text-left ${
              selected ? 'border-gold bg-gold/10 scale-[1.02]' : 'border-white/10 bg-ink-800/60 hover:bg-ink-700/60'
            }`}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})` }}
            >
              {c.emoji}
            </span>
            <span className="min-w-0">
              <p className={`text-xs font-semibold truncate ${selected ? 'text-gold-light' : 'text-slate-200'}`}>{c.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{c.title}</p>
            </span>
          </button>
        );
      })}
    </div>
  );
}
