import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ITEM_BY_ID } from '../../shared/catalog.ts';
import type { PublicPlayer } from '../../shared/protocol.ts';
import { serverNow } from './net.ts';
import { play, setMuted, useMuted } from './sound.ts';

const BASE = import.meta.env.BASE_URL;
export const itemSrc = (id: string, thumb = false) => `${BASE}items/${thumb ? 'thumb/' : ''}${id}.webp`;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cor de cada avatar: as folhas seguem a ordem vermelho → rosa (9 cores × 4 modelos de robô).
const COLORS = ['#ff4d5e', '#ff8a1f', '#ffd21f', '#7ee03a', '#18d1c0', '#3db4ff', '#3d6bff', '#a64dff', '#ff4fa8'];
export const avatarColor = (n: number) => COLORS[(n - 1) % 9];

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className={`logo ${small ? 'logo-sm' : ''}`} aria-label="Impostor da Rede">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#lg)" />
        <path d="M9 10l7 6 7-6M16 16v7" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85" />
        <circle cx="9" cy="10" r="3" fill="#fff" />
        <circle cx="23" cy="10" r="3" fill="#fff" />
        <circle cx="16" cy="23" r="3.4" fill="#ff3b5c" stroke="#fff" strokeWidth="1.4" />
      </svg>
      <span>
        Impostor <b>da Rede</b>
      </span>
    </div>
  );
}

export function Avatar({ n, size = 48, out, className = '' }: { n: number; size?: number; out?: boolean; className?: string }) {
  return (
    <span className={`avatar ${out ? 'out' : ''} ${className}`} style={{ width: size, height: size, '--c': avatarColor(n) } as CSSProperties}>
      <img src={`${BASE}avatars/a${String(n).padStart(2, '0')}.webp`} alt="" width={size} height={size} draggable={false} />
    </span>
  );
}

export function PlayerTag({ p, size = 40, children }: { p: PublicPlayer; size?: number; children?: ReactNode }) {
  return (
    <span className="ptag" style={{ '--c': avatarColor(p.avatar) } as CSSProperties}>
      <Avatar n={p.avatar} size={size} out={!p.alive} />
      <b>{p.name}</b>
      {children}
    </span>
  );
}

export function ItemImg({ id, size, thumb, className = '' }: { id: string; size?: number; thumb?: boolean; className?: string }) {
  return (
    <img
      className={`item-img ${className}`}
      src={itemSrc(id, thumb)}
      alt={ITEM_BY_ID[id]?.name ?? ''}
      width={size}
      height={size}
      draggable={false}
    />
  );
}

export function useTicker(ms: number) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return serverNow();
}

export function Countdown({ endsAt, total, size = 110, sound = true }: { endsAt: number; total: number; size?: number; sound?: boolean }) {
  const now = useTicker(200);
  const left = Math.max(0, endsAt - now);
  const secs = Math.ceil(left / 1000);
  const last = useRef(secs);
  useEffect(() => {
    if (sound && secs !== last.current && secs <= 5 && secs >= 1) play('contagem', 0.8);
    last.current = secs;
  }, [secs, sound]);
  const r = 44;
  const c = 2 * Math.PI * r;
  const danger = secs <= 10;
  return (
    <div className={`countdown ${danger ? 'danger' : ''}`} style={{ width: size, height: size }} role="timer" aria-label={`${secs} segundos`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="track" />
        <circle cx="50" cy="50" r={r} className="bar" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} />
      </svg>
      <span key={danger ? secs : 0}>{secs}</span>
    </div>
  );
}

export function SoundToggle() {
  const muted = useMuted();
  return (
    <button className="icon-btn" onClick={() => setMuted(!muted)} aria-pressed={!muted} title={muted ? 'Ligar som' : 'Desligar som'}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

// Fundo vivo: pontos de rede ligados por linhas e "pacotes" correndo (só transform/opacity).
export function NetBackdrop() {
  return (
    <div className="netbg" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g className="netbg-lines">
          <path d="M120 160L520 300L900 140L1320 260L1520 120M520 300L640 640L1040 560L1320 260M640 640L260 760M1040 560L1460 760M900 140L1040 560" />
        </g>
        {[[120, 160], [520, 300], [900, 140], [1320, 260], [1520, 120], [640, 640], [1040, 560], [260, 760], [1460, 760]].map(([x, y], k) => (
          <circle key={k} cx={x} cy={y} r="6" className="netbg-node" style={{ animationDelay: `${k * 0.7}s` }} />
        ))}
      </svg>
      {[0, 1, 2, 3, 4, 5].map((k) => <i key={k} className={`packet p${k}`} />)}
    </div>
  );
}

// Dispara uma vez por chave (ex.: um som quando muda a fase ou a fala).
export function useOnce(key: string | number | null, fn: () => void) {
  const last = useRef<string | number | null>(null);
  useEffect(() => {
    if (key === null || key === last.current) return;
    last.current = key;
    fn();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
