// Tipos e tempos trocados entre servidor e navegador.

export const MAX_ROUNDS = 20; // chegou aqui e o impostor não caiu: o impostor vence
export const MAX_PLAYERS = 36; // um avatar diferente para cada aluno
export const AVATARS = 36;
export const INTRO_MS = 6000; // item grande na TV antes das falas
export const PHRASE_MS = 10_000; // cada fala fica 10 s na TV
export const VOTE_MS = 60_000;
export const RESULT_MS = 9000; // animação de eliminação antes do fim de jogo
export const PHRASE_MIN = 3;
export const PHRASE_MAX = 80;
export const WRITE_OPTIONS = [45, 60, 90, 120];

export type Phase = 'lobby' | 'writing' | 'reveal' | 'voting' | 'result' | 'finished';
export type Help = 'sortear' | 'dica' | 'pixel' | 'dupla';
export type Team = 'crew' | 'impostors';

export const HELP_LABEL: Record<Help, string> = {
  sortear: 'Sortear a cada rodada',
  dica: 'Só uma dica escrita',
  pixel: 'Imagem pixelada',
  dupla: 'Dois itens (um é o certo)',
};

export interface Settings {
  impostors: number; // 1 a 3
  writeSeconds: number;
  help: Help;
}

export const minPlayers = (impostors: number) => impostors * 2 + 1;

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number; // 1..36
  alive: boolean;
  online: boolean;
  points: number;
  wasImpostor?: boolean; // só aparece depois de eliminado (ou no fim)
}

export interface Phrase {
  playerId: string;
  text: string; // vazio = não escreveu a tempo
}

export interface VoteResult {
  tally: Record<string, number>; // playerId → votos
  skip: number;
  eliminatedId: string | null;
  wasImpostor: boolean;
  impostorsLeft: number;
}

export interface PublicRoom {
  code: string;
  phase: Phase;
  serverNow: number;
  settings: Settings;
  round: number;
  players: PublicPlayer[];
  writeEndsAt: number | null;
  submitted: string[]; // quem já mandou a frase (sem o texto)
  itemId: string | null; // só depois que todos escreveram
  phrases: Phrase[]; // só depois que todos escreveram
  showAt: number | null; // hora em que a 1ª fala aparece (antes disso, o item grande)
  pausedAt: number | null;
  voteEndsAt: number | null;
  voted: string[];
  result: VoteResult | null;
  winner: Team | null;
  endReason: 'caught' | 'outnumbered' | 'rounds' | 'teacher' | null;
}

// Cartão secreto de cada aluno na rodada (vai só para o próprio aluno).
export type Card =
  | { round: number; role: 'crew'; itemId: string }
  | { round: number; role: 'impostor'; allies: string[]; help: 'dica'; category: string; hint: string }
  | { round: number; role: 'impostor'; allies: string[]; help: 'pixel'; category: string; pixel: string }
  | { round: number; role: 'impostor'; allies: string[]; help: 'dupla'; options: [string, string] };

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type TeacherAction =
  | 'start' | 'endWriting' | 'pause' | 'resume' | 'next' | 'prev' | 'openVote' | 'closeVote' | 'nextRound' | 'end' | 'restart' | 'kick';

export interface ClientEvents {
  'teacher:create': (p: Settings, ack: (r: Ack<{ code: string; token: string }>) => void) => void;
  'teacher:resume': (p: { code: string; token: string }, ack: (r: Ack) => void) => void;
  'teacher:settings': (p: Settings, ack: (r: Ack) => void) => void;
  'teacher:action': (p: { action: TeacherAction; playerId?: string }, ack: (r: Ack) => void) => void;
  'player:join': (p: { code: string; name: string }, ack: (r: Ack<{ playerId: string; token: string }>) => void) => void;
  'player:resume': (p: { code: string; token: string }, ack: (r: Ack<{ playerId: string }>) => void) => void;
  'player:phrase': (p: { text: string }, ack: (r: Ack) => void) => void;
  'player:vote': (p: { target: string }, ack: (r: Ack) => void) => void; // target = playerId ou 'skip'
}

export interface ServerEvents {
  state: (room: PublicRoom) => void;
  // Avisos pequenos (poupam banda): alguém mandou a frase ou votou.
  mark: (p: { kind: 'phrase' | 'vote'; playerId: string }) => void;
  card: (card: Card | null) => void;
  myVote: (target: string | null) => void;
  kicked: () => void;
}

// Fala mostrada agora na TV: -1 = item grande; phrases.length = acabou.
export function showIndex(room: Pick<PublicRoom, 'showAt' | 'pausedAt'>, now: number) {
  if (room.showAt === null) return -1;
  const t = (room.pausedAt ?? now) - room.showAt;
  return t < 0 ? -1 : Math.floor(t / PHRASE_MS);
}

export interface Ranked {
  player: PublicPlayer;
  position: number;
}

export const rankPlayers = (players: PublicPlayer[]): Ranked[] =>
  [...players]
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((player, k) => ({ player, position: k + 1 }));
