import { AVATAR_EMOJIS, getAvatar, PRESET_AVATAR_SEEDS } from '../lib/avatar';

interface AvatarPickerProps {
  value: string;
  onChange: (seed: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-40 overflow-y-auto p-1">
      {PRESET_AVATAR_SEEDS.map((seed, i) => {
        const { emoji, gradient } = getAvatar(seed);
        const selected = seed === value;
        return (
          <button
            key={seed}
            type="button"
            onClick={() => onChange(seed)}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-transform ${
              selected ? 'ring-2 ring-gold scale-110' : 'hover:scale-105'
            }`}
            style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
            title={AVATAR_EMOJIS[i]}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
