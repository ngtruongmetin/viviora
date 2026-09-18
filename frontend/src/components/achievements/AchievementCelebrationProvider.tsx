import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export type AchievementEvent = { code: string; name: string; condition_text: string; exp_reward: number };
export type AchievementEventPayload = { unlocked?: AchievementEvent[]; previousLevel?: number; currentLevel?: number; leveledUp?: boolean; exp?: number; currentLevelExp?: number; nextLevelExp?: number | null };
const CelebrationContext = createContext<{ announce: (payload: AchievementEventPayload) => void }>({ announce: () => undefined });

export function announceAchievement(payload: AchievementEventPayload) {
  if (!payload?.unlocked?.length && !payload?.leveledUp) return;
  window.dispatchEvent(new CustomEvent<AchievementEventPayload>('viviora-achievement-events', { detail: payload }));
}

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => { const ratio = window.devicePixelRatio || 1; canvas.width = Math.floor(window.innerWidth * ratio); canvas.height = Math.floor(window.innerHeight * ratio); canvas.style.width = `${window.innerWidth}px`; canvas.style.height = `${window.innerHeight}px`; };
    resize();
    const instance = confetti.create(canvas, { resize: false, useWorker: false });
    window.addEventListener('resize', resize);
    void instance({ particleCount: 120, spread: 80, origin: { y: 0.62 }, colors: ['#0040df', '#e7e700', '#ccff00', '#d52a0a'] });
    return () => { window.removeEventListener('resize', resize); instance.reset(); canvas.width = 0; canvas.height = 0; };
  }, []);
  return <canvas ref={canvasRef} className="achievement-confetti" aria-hidden="true" />;
}

export function AchievementCelebrationProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Array<{ type: 'achievement' | 'level'; event?: AchievementEvent; from?: number; to?: number }>>([]);
  const current = queue[0];
  const announce = (payload: AchievementEventPayload) => setQueue((items) => [...items, ...(payload.unlocked || []).map((event) => ({ type: 'achievement' as const, event })), ...(payload.leveledUp ? [{ type: 'level' as const, from: payload.previousLevel, to: payload.currentLevel }] : [])]);
  useEffect(() => { const listener = (event: Event) => announce((event as CustomEvent<AchievementEventPayload>).detail); window.addEventListener('viviora-achievement-events', listener); return () => window.removeEventListener('viviora-achievement-events', listener); }, []);
  const value = useMemo(() => ({ announce }), []);
  const overlay = current && <div className="achievement-celebration-backdrop" role="dialog" aria-modal="true"><Confetti key={current.event?.code || `level-${current.to}`} /><section className="achievement-celebration"><button className="achievement-celebration-close" type="button" onClick={() => setQueue((items) => items.slice(1))} aria-label="Đóng"><X size={18} /></button><Trophy size={54} className="achievement-celebration-icon" />{current.type === 'achievement' ? <><span className="eyebrow">CHÚC MỪNG!</span><h2>BẠN ĐÃ ĐẠT THÀNH TỰU</h2><strong>{current.event?.name}</strong><p>{current.event?.condition_text}</p><p>+{current.event?.exp_reward} EXP</p></> : <><span className="eyebrow">CHÚC MỪNG!</span><h2>BẠN ĐÃ LÊN LEVEL</h2><strong>LEVEL {current.to}</strong><p>Tiến bộ từ level {current.from}</p></>}<button className="button primary" type="button" onClick={() => setQueue((items) => items.slice(1))}>TIẾP TỤC</button></section></div>;
  return <CelebrationContext.Provider value={value}>{children}{overlay && createPortal(overlay, document.body)}</CelebrationContext.Provider>;
}

export function useAchievementCelebration() { return useContext(CelebrationContext); }
