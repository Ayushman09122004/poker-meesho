import { GameMode, RoomSettings, TableTheme } from '../../../shared/types';

interface SettingsFormProps {
  settings: Partial<RoomSettings>;
  onChange: (patch: Partial<RoomSettings>) => void;
  compact?: boolean;
}

const THEMES: { id: TableTheme; label: string; swatch: string }[] = [
  { id: 'midnight', label: 'Midnight', swatch: 'linear-gradient(135deg,#101a33,#1c2b52)' },
  { id: 'emerald', label: 'Emerald', swatch: 'linear-gradient(135deg,#0b3d2e,#125c44)' },
  { id: 'crimson', label: 'Crimson', swatch: 'linear-gradient(135deg,#3d0b17,#5c1225)' },
  { id: 'royal', label: 'Royal', swatch: 'linear-gradient(135deg,#1a1033,#2b1c52)' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-400 text-xs uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-gold/60 transition-colors';

function GameModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left rounded-lg border-2 px-3 py-2 transition-all ${
        active ? 'border-gold bg-gold/10' : 'border-white/10 bg-ink-800 hover:bg-ink-700'
      }`}
    >
      <p className={`text-sm font-semibold ${active ? 'text-gold-light' : 'text-slate-200'}`}>{title}</p>
      <p className="text-[11px] text-slate-500">{description}</p>
    </button>
  );
}

export function SettingsForm({ settings, onChange, compact }: SettingsFormProps) {
  return (
    <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-4`}>
      <Field label="Starting chips">
        <select
          className={inputClass}
          value={settings.startingChips ?? 5000}
          onChange={(e) => onChange({ startingChips: Number(e.target.value) })}
        >
          {[1000, 2500, 5000, 10000, 25000, 50000].map((v) => (
            <option key={v} value={v}>
              {v.toLocaleString()}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Small blind">
        <input
          type="number"
          min={1}
          className={inputClass}
          value={settings.smallBlind ?? 25}
          onChange={(e) => onChange({ smallBlind: Number(e.target.value) })}
        />
      </Field>

      <Field label="Big blind">
        <input
          type="number"
          min={2}
          className={inputClass}
          value={settings.bigBlind ?? 50}
          onChange={(e) => onChange({ bigBlind: Number(e.target.value) })}
        />
      </Field>

      <Field label="Turn timer (sec)">
        <input
          type="number"
          min={10}
          max={120}
          className={inputClass}
          value={settings.turnTimerSeconds ?? 30}
          onChange={(e) => onChange({ turnTimerSeconds: Number(e.target.value) })}
        />
      </Field>

      <Field label="Max players">
        <input
          type="number"
          min={2}
          max={9}
          className={inputClass}
          value={settings.maxPlayers ?? 9}
          onChange={(e) => onChange({ maxPlayers: Number(e.target.value) })}
        />
      </Field>

      <Field label="Blind increase every">
        <select
          className={inputClass}
          value={settings.blindIncreaseIntervalHands ?? 0}
          onChange={(e) => onChange({ blindIncreaseIntervalHands: Number(e.target.value) })}
        >
          <option value={0}>Never</option>
          <option value={5}>5 hands</option>
          <option value={10}>10 hands</option>
          <option value={15}>15 hands</option>
          <option value={20}>20 hands</option>
        </select>
      </Field>

      <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="accent-gold w-4 h-4"
            checked={!!settings.isPrivate}
            onChange={(e) => onChange({ isPrivate: e.target.checked })}
          />
          Private room
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="accent-gold w-4 h-4"
            checked={!!settings.autoStartWhenReady}
            onChange={(e) => onChange({ autoStartWhenReady: e.target.checked })}
          />
          Auto-start when everyone is ready
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="accent-gold w-4 h-4"
            checked={!!settings.rebuyEnabled}
            onChange={(e) => onChange({ rebuyEnabled: e.target.checked })}
          />
          Allow rebuys (virtual chips)
        </label>
      </div>

      <div className="col-span-2 sm:col-span-3">
        <span className="text-slate-400 text-xs uppercase tracking-wide">Game mode</span>
        <div className="flex gap-2 mt-2">
          <GameModeButton
            active={(settings.gameMode ?? 'assisted') === 'assisted'}
            title="Assisted"
            description="Shows your best hand & highlights it"
            onClick={() => onChange({ gameMode: 'assisted' as GameMode })}
          />
          <GameModeButton
            active={settings.gameMode === 'professional'}
            title="Professional"
            description="No hints — just the cards"
            onClick={() => onChange({ gameMode: 'professional' as GameMode })}
          />
        </div>
      </div>

      <div className="col-span-2 sm:col-span-3">
        <span className="text-slate-400 text-xs uppercase tracking-wide">Table theme</span>
        <div className="flex gap-3 mt-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ tableTheme: t.id })}
              className={`w-14 h-10 rounded-lg border-2 transition-all ${
                (settings.tableTheme ?? 'midnight') === t.id ? 'border-gold scale-105' : 'border-white/10'
              }`}
              style={{ background: t.swatch }}
              title={t.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
