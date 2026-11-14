// Conexão com o servidor e estado da sala compartilhado entre as telas.
import { io, type Socket } from 'socket.io-client';
import { useSyncExternalStore } from 'react';
import type { Ack, Card, ClientEvents, PublicRoom, ServerEvents } from '../../shared/protocol.ts';

export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3000`;

export const socket: Socket<ServerEvents, ClientEvents> = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 4000,
});

let room: PublicRoom | null = null;
let card: Card | null = null;
let myVote: string | null = null;
const offsets: number[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

// O relógio do servidor manda: a amostra com menor atraso de rede é a de maior diferença.
export const serverNow = () => Date.now() + (offsets.length ? Math.max(...offsets) : 0);

socket.on('state', (r) => {
  offsets.push(r.serverNow - Date.now());
  if (offsets.length > 12) offsets.shift();
  if (r.phase !== 'voting' || room?.phase !== 'voting') myVote = null;
  room = r;
  emit();
});
// Aviso pequeno: só marca quem escreveu/votou, sem reenviar a sala inteira.
socket.on('mark', ({ kind, playerId }) => {
  if (!room) return;
  const key = kind === 'phrase' ? 'submitted' : 'voted';
  if (!room[key].includes(playerId)) room = { ...room, [key]: [...room[key], playerId] };
  emit();
});
socket.on('card', (c) => ((card = c), emit()));
socket.on('myVote', (v) => ((myVote = v), emit()));

export const setMyVote = (v: string) => ((myVote = v), emit());
export const clearRoom = () => {
  room = null;
  card = null;
  myVote = null;
  emit();
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => void listeners.delete(f);
};
export const useRoom = () => useSyncExternalStore(subscribe, () => room);
export const useCard = () => useSyncExternalStore(subscribe, () => card);
export const useMyVote = () => useSyncExternalStore(subscribe, () => myVote);

let connected = socket.connected;
socket.on('connect', () => ((connected = true), emit()));
socket.on('disconnect', () => ((connected = false), emit()));
export const useConnected = () => useSyncExternalStore(subscribe, () => connected);

export async function send<E extends keyof ClientEvents>(
  event: E,
  payload: Parameters<ClientEvents[E]>[0],
): Promise<Parameters<Parameters<ClientEvents[E]>[1]>[0]> {
  try {
    // @ts-expect-error emitWithAck não consegue inferir o tipo do ack genérico
    return await socket.timeout(8000).emitWithAck(event, payload);
  } catch {
    return { ok: false, error: 'Sem resposta do servidor. Verifique a internet.' } as Ack as never;
  }
}

// Sessão salva para voltar depois de recarregar a página.
export type Session =
  | { role: 'teacher'; code: string; token: string }
  | { role: 'player'; code: string; token: string; playerId: string };
const KEY = 'impostor-rede:sessao';
export function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
}
export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* modo anônimo sem storage: a sessão só vale até recarregar */
  }
}
