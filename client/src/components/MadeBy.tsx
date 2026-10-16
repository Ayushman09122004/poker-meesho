export const CREATOR = 'Ayushman Ranjan';
export const GAME_NAME = 'Felt & Friends™';

/** "Made by Ayushman Ranjan" credit line used across the app. */
export function MadeBy({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[11px] text-slate-500 tracking-wide ${className}`}>
      {GAME_NAME} · Made by <span className="text-gold-light/80 font-semibold">{CREATOR}</span> · © {new Date().getFullYear()}
    </p>
  );
}
