// Regras do Impostor da Rede. Sem rede: o servidor chama estes métodos e publica o estado.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CATEGORY_LABEL, ITEMS, ITEM_BY_ID } from '../shared/catalog.ts';
import {
  AVATARS, INTRO_MS, MAX_PLAYERS, MAX_ROUNDS, PHRASE_MAX, PHRASE_MIN, PHRASE_MS, RESULT_MS, VOTE_MS, WRITE_OPTIONS,
  minPlayers, showIndex, type Card, type Help, type Phase, type PublicPlayer, type PublicRoom, type Settings, type Team,
  type VoteResult,
} from '../shared/protocol.ts';
import { HINTS } from './hints.ts';

const PIXELS: Record<string, string> = JSON.parse(readFileSync(new URL('./pixels.json', import.meta.url), 'utf8'));
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const IDLE_MS = 4 * 60 * 60 * 1000;
export const POINTS = { rightVote: 100, impostorRound: 100, win: 300 };

export interface Clock {
  now(): number;
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
  random(): number;
}

export const realClock: Clock = {
  now: () => Date.now(),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  random: Math.random,
};

interface Player extends PublicPlayer {
  token: string;
  impostor: boolean;
}

export interface Room {
  code: string;
  teacherToken: string;
  phase: Phase;
  settings: Settings;
  round: number;
  players: Player[];
  deck: string[];
  itemId: string | null;
  help: Exclude<Help, 'sortear'>;
  decoy: string;
  flip: boolean; // ordem dos dois itens no modo dupla
  phrases: Map<string, string>;
  order: string[]; // ordem das falas na TV (sorteada)
  writeEndsAt: number | null;
  showAt: number | null;
  pausedAt: number | null;
  voteEndsAt: number | null;
  votes: Map<string, string>;
  result: VoteResult | null;
  winner: Team | null;
  endReason: PublicRoom['endReason'];
  timer: unknown;
  lastActivity: number;
}

export class GameError extends Error {}
function fail(msg: string): never {
  throw new GameError(msg);
}
const token = () => randomBytes(16).toString('hex');

export class Game {
  rooms = new Map<string, Room>();
  clock: Clock;
  onChange: (room: Room) => void;
  onMark: (room: Room, kind: 'phrase' | 'vote', playerId: string) => void;
  onCards: (room: Room) => void;
  maxRooms: number;

  constructor(opts: {
    clock?: Clock; onChange?: (room: Room) => void; onMark?: Game['onMark']; onCards?: (room: Room) => void; maxRooms?: number;
  } = {}) {
    this.clock = opts.clock ?? realClock;
    this.onChange = opts.onChange ?? (() => {});
    this.onMark = opts.onMark ?? (() => {});
    this.onCards = opts.onCards ?? (() => {});
    this.maxRooms = opts.maxRooms ?? 30;
  }

  private pick<T>(list: T[]): T {
    return list[Math.floor(this.clock.random() * list.length)];
  }

  private shuffle<T>(list: T[]): T[] {
    const a = [...list];
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(this.clock.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  }

  private touch(room: Room) {
    room.lastActivity = this.clock.now();
    this.onChange(room);
  }

  private schedule(room: Room, fn: () => void, ms: number) {
    this.stopTimer(room);
    room.timer = this.clock.set(() => {
      room.timer = null;
      fn();
    }, Math.max(0, ms));
  }

  private stopTimer(room: Room) {
    if (room.timer) this.clock.clear(room.timer);
    room.timer = null;
  }

  cleanup() {
    const now = this.clock.now();
    for (const [code, room] of this.rooms)
      if (now - room.lastActivity > IDLE_MS) {
        this.stopTimer(room);
        this.rooms.delete(code);
      }
  }

  private settings(s: Partial<Settings> | undefined): Settings {
    const impostors = Number(s?.impostors);
    const writeSeconds = Number(s?.writeSeconds);
    if (![1, 2, 3].includes(impostors)) fail('Escolha de 1 a 3 impostores.');
    if (!WRITE_OPTIONS.includes(writeSeconds)) fail('Tempo para escrever inválido.');
    const help = (['sortear', 'dica', 'pixel', 'dupla'] as Help[]).includes(s?.help as Help) ? (s!.help as Help) : 'sortear';
    return { impostors, writeSeconds, help };
  }

  createRoom(input: Partial<Settings>) {
    const settings = this.settings(input);
    this.cleanup();
    if (this.rooms.size >= this.maxRooms) fail('O servidor está cheio. Tente de novo em alguns minutos.');
    let code = '';
    do code = Array.from({ length: 4 }, () => this.pick([...CODE_CHARS])).join('');
    while (this.rooms.has(code));
    const room: Room = {
      code, teacherToken: token(), phase: 'lobby', settings, round: 0, players: [], deck: [], itemId: null, help: 'dica',
      decoy: '', flip: false, phrases: new Map(), order: [], writeEndsAt: null, showAt: null, pausedAt: null, voteEndsAt: null,
      votes: new Map(), result: null, winner: null, endReason: null, timer: null, lastActivity: this.clock.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  setSettings(room: Room, input: Partial<Settings>) {
    if (room.phase !== 'lobby') fail('Só dá para mudar as regras antes de começar.');
    room.settings = this.settings(input);
    this.touch(room);
  }

  room(code: unknown): Room {
    const room = typeof code === 'string' ? this.rooms.get(code.trim().toUpperCase()) : undefined;
    return room ?? fail('Sala não encontrada. Confira o código.');
  }

  teacher(code: unknown, tok: unknown): Room {
    const room = this.room(code);
    if (tok !== room.teacherToken) fail('Acesso de professor inválido.');
    return room;
  }

  join(code: unknown, rawName: unknown) {
    const room = this.room(code);
    if (room.phase !== 'lobby') fail('A partida já começou. Espere a próxima.');
    if (room.players.length >= MAX_PLAYERS) fail('A sala está cheia.');
    let name = String(rawName ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (name.replace(/[^\p{L}\p{N}]/gu, '').length < 2) fail('Digite seu nome (pelo menos 2 letras).');
    const taken = (n: string) => room.players.some((p) => p.name.toLowerCase() === n.toLowerCase());
    for (let k = 2; taken(name); k++) name = `${name.replace(/ \d+$/, '')} ${k}`;
    const used = new Set(room.players.map((p) => p.avatar));
    const avatar = this.pick(Array.from({ length: AVATARS }, (_, k) => k + 1).filter((a) => !used.has(a)));
    const player: Player = { id: token().slice(0, 10), token: token(), name, avatar, alive: true, online: true, points: 0, impostor: false };
    room.players.push(player);
    this.touch(room);
    return { room, player };
  }

  resume(code: unknown, tok: unknown) {
    const room = this.room(code);
    const player = room.players.find((p) => p.token === tok) ?? fail('Você não está mais nessa sala.');
    return { room, player };
  }

  setOnline(room: Room, playerId: string, online: boolean) {
    const p = room.players.find((x) => x.id === playerId);
    if (!p || p.online === online) return;
    p.online = online;
    this.touch(room);
    if (!online) this.checkEveryone(room);
  }

  kick(room: Room, playerId: unknown) {
    const player = room.players.find((p) => p.id === playerId) ?? fail('Aluno não encontrado.');
    room.players = room.players.filter((p) => p !== player);
    room.phrases.delete(player.id);
    room.votes.delete(player.id);
    for (const [voter, target] of room.votes) if (target === player.id) room.votes.delete(voter);
    room.order = room.order.filter((id) => id !== player.id);
    this.touch(room);
    if (room.phase !== 'lobby' && room.phase !== 'finished' && !this.checkWinner(room)) this.checkEveryone(room);
    return player;
  }

  private alive(room: Room) {
    return room.players.filter((p) => p.alive);
  }

  start(room: Room) {
    if (room.phase !== 'lobby') fail('A partida já começou.');
    const need = minPlayers(room.settings.impostors);
    if (room.players.length < need)
      fail(`Com ${room.settings.impostors} impostor${room.settings.impostors > 1 ? 'es' : ''} são precisos pelo menos ${need} alunos.`);
    const impostors = new Set(this.shuffle(room.players).slice(0, room.settings.impostors).map((p) => p.id));
    for (const p of room.players) Object.assign(p, { alive: true, points: 0, impostor: impostors.has(p.id), wasImpostor: undefined });
    room.round = 0;
    room.deck = [];
    room.winner = null;
    room.endReason = null;
    this.startRound(room);
  }

  // Próximo item: baralho embaralhado, sem repetir até acabar (e sem repetir o último ao reembaralhar).
  private draw(room: Room) {
    if (!room.deck.length) {
      room.deck = this.shuffle(ITEMS.map((it) => it.id));
      if (room.deck.at(-1) === room.itemId) room.deck.unshift(room.deck.pop()!);
    }
    return room.deck.pop()!;
  }

  private startRound(room: Room) {
    room.round += 1;
    room.itemId = this.draw(room);
    const item = ITEM_BY_ID[room.itemId];
    room.help = room.settings.help === 'sortear' ? this.pick(['dica', 'pixel', 'dupla'] as const) : room.settings.help;
    const same = ITEMS.filter((it) => it.id !== item.id && it.category === item.category);
    room.decoy = this.pick(same).id;
    room.flip = this.clock.random() < 0.5;
    room.phrases.clear();
    room.votes.clear();
    Object.assign(room, { order: [], showAt: null, pausedAt: null, voteEndsAt: null, result: null, phase: 'writing' });
    room.writeEndsAt = this.clock.now() + room.settings.writeSeconds * 1000;
    this.schedule(room, () => this.endWriting(room), room.settings.writeSeconds * 1000);
    this.onCards(room);
    this.touch(room);
  }

  // Cartão secreto do aluno: o impostor nunca recebe o id do item, só a ajuda da rodada.
  card(room: Room, playerId: string): Card | null {
    const p = room.players.find((x) => x.id === playerId);
    if (!p?.alive || !room.itemId || room.phase === 'lobby' || room.phase === 'finished') return null;
    if (!p.impostor) return { round: room.round, role: 'crew', itemId: room.itemId };
    const allies = room.players.filter((x) => x.impostor && x.id !== p.id).map((x) => x.id);
    const category = CATEGORY_LABEL[ITEM_BY_ID[room.itemId].category];
    if (room.help === 'dica') return { round: room.round, role: 'impostor', allies, help: 'dica', category, hint: HINTS[room.itemId] };
    if (room.help === 'pixel') return { round: room.round, role: 'impostor', allies, help: 'pixel', category, pixel: PIXELS[room.itemId] };
    // A ordem é sorteada na rodada e fica a mesma se o aluno recarregar a página.
    const options: [string, string] = room.flip ? [room.itemId, room.decoy] : [room.decoy, room.itemId];
    return { round: room.round, role: 'impostor', allies, help: 'dupla', options };
  }

  submitPhrase(room: Room, playerId: string, raw: unknown) {
    const p = room.players.find((x) => x.id === playerId) ?? fail('Jogador não encontrado.');
    if (room.phase !== 'writing') fail('O tempo para escrever acabou.');
    if (!p.alive) fail('Você foi eliminado e agora só assiste.');
    if (room.phrases.has(p.id)) fail('Você já mandou a sua frase.');
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (text.length < PHRASE_MIN) fail(`Escreva pelo menos ${PHRASE_MIN} letras.`);
    if (text.length > PHRASE_MAX) fail(`A frase pode ter no máximo ${PHRASE_MAX} letras.`);
    room.phrases.set(p.id, text);
    room.lastActivity = this.clock.now();
    this.onMark(room, 'phrase', p.id);
    this.checkEveryone(room);
  }

  // Todos os alunos vivos e conectados já escreveram / votaram? Então não precisa esperar o tempo.
  private checkEveryone(room: Room) {
    const waiting = this.alive(room).filter((p) => p.online);
    if (room.phase === 'writing' && waiting.every((p) => room.phrases.has(p.id))) this.endWriting(room);
    else if (room.phase === 'voting' && waiting.every((p) => room.votes.has(p.id))) this.closeVote(room);
  }

  endWriting(room: Room) {
    if (room.phase !== 'writing') fail('Ninguém está escrevendo agora.');
    room.phase = 'reveal';
    room.writeEndsAt = null;
    room.order = this.shuffle(this.alive(room).map((p) => p.id));
    room.showAt = this.clock.now() + INTRO_MS;
    room.pausedAt = null;
    this.scheduleVote(room);
    this.touch(room);
  }

  private scheduleVote(room: Room) {
    if (room.showAt === null || room.pausedAt !== null) return this.stopTimer(room);
    this.schedule(room, () => this.openVote(room), room.showAt + room.order.length * PHRASE_MS - this.clock.now());
  }

  // Controle da apresentação das falas na TV (pausar, voltar, avançar).
  showControl(room: Room, action: 'pause' | 'resume' | 'next' | 'prev') {
    if (room.phase !== 'reveal' || room.showAt === null) fail('As falas não estão sendo mostradas agora.');
    const now = this.clock.now();
    const ref = room.pausedAt ?? now;
    const idx = showIndex(room, now);
    if (action === 'pause') room.pausedAt ??= now;
    else if (action === 'resume' && room.pausedAt !== null) {
      room.showAt += now - room.pausedAt;
      room.pausedAt = null;
    } else if (action === 'next') {
      if (idx + 1 >= room.order.length) return this.openVote(room);
      room.showAt = ref - (idx + 1) * PHRASE_MS;
    } else if (action === 'prev') {
      const to = Math.max(-1, idx - 1);
      room.showAt = to < 0 ? ref + INTRO_MS : ref - to * PHRASE_MS;
    }
    this.scheduleVote(room);
    this.touch(room);
  }

  openVote(room: Room) {
    if (room.phase !== 'reveal') fail('A votação só abre depois das falas.');
    room.phase = 'voting';
    room.pausedAt = null;
    room.voteEndsAt = this.clock.now() + VOTE_MS;
    room.votes.clear();
    this.schedule(room, () => this.closeVote(room), VOTE_MS);
    this.touch(room);
  }

  vote(room: Room, playerId: string, target: unknown) {
    const p = room.players.find((x) => x.id === playerId) ?? fail('Jogador não encontrado.');
    if (room.phase !== 'voting') fail('A votação não está aberta.');
    if (!p.alive) fail('Você foi eliminado e não vota mais.');
    if (room.votes.has(p.id)) fail('Você já votou nesta rodada.');
    if (target !== 'skip') {
      if (target === p.id) fail('Você não pode votar em você mesmo.');
      if (!this.alive(room).some((x) => x.id === target)) fail('Escolha um aluno que ainda está no jogo.');
    }
    room.votes.set(p.id, target as string);
    room.lastActivity = this.clock.now();
    this.onMark(room, 'vote', p.id);
    this.checkEveryone(room);
  }

  votedFor(room: Room, playerId: string) {
    return room.phase === 'voting' ? (room.votes.get(playerId) ?? null) : null;
  }

  closeVote(room: Room) {
    if (room.phase !== 'voting') fail('A votação não está aberta.');
    const tally: Record<string, number> = {};
    let skip = 0;
    for (const [voter, target] of room.votes) {
      if (target === 'skip') {
        skip++;
        continue;
      }
      tally[target] = (tally[target] ?? 0) + 1;
      const v = room.players.find((x) => x.id === voter);
      if (v && !v.impostor && room.players.find((x) => x.id === target)?.impostor) v.points += POINTS.rightVote;
    }
    // Sai quem tiver mais votos sozinho, e mais votos que o "pular". Empate: ninguém sai.
    const top = Math.max(0, ...Object.values(tally));
    const leaders = Object.keys(tally).filter((id) => tally[id] === top);
    const out = top > 0 && top > skip && leaders.length === 1 ? room.players.find((x) => x.id === leaders[0]) : undefined;
    if (out) {
      out.alive = false;
      out.wasImpostor = out.impostor;
    }
    for (const p of this.alive(room)) if (p.impostor) p.points += POINTS.impostorRound;
    room.result = {
      tally, skip, eliminatedId: out?.id ?? null, wasImpostor: !!out?.impostor,
      impostorsLeft: this.alive(room).filter((p) => p.impostor).length,
    };
    room.phase = 'result';
    room.voteEndsAt = null;
    this.stopTimer(room);
    const winner = this.winnerNow(room);
    if (winner) this.schedule(room, () => this.finish(room, winner.team, winner.reason), RESULT_MS);
    this.touch(room);
  }

  private winnerNow(room: Room): { team: Team; reason: NonNullable<PublicRoom['endReason']> } | null {
    const alive = this.alive(room);
    const impostors = alive.filter((p) => p.impostor).length;
    if (!impostors) return { team: 'crew', reason: 'caught' };
    // Com 1 impostor: sobrou ele + 1 aluno. Com mais: impostores empatam ou passam os alunos.
    if (impostors >= alive.length - impostors) return { team: 'impostors', reason: 'outnumbered' };
    if (room.phase === 'result' && room.round >= MAX_ROUNDS) return { team: 'impostors', reason: 'rounds' };
    return null;
  }

  // Depois de remover um aluno no meio do jogo, a partida pode ter acabado.
  private checkWinner(room: Room) {
    const w = this.winnerNow(room);
    if (w) this.finish(room, w.team, w.reason);
    return !!w;
  }

  nextRound(room: Room) {
    if (room.phase !== 'result') fail('Termine a votação antes.');
    if (room.winner || this.winnerNow(room)) fail('A partida acabou.');
    this.startRound(room);
  }

  finish(room: Room, winner: Team | null, reason: NonNullable<PublicRoom['endReason']>) {
    if (room.phase === 'finished') return;
    this.stopTimer(room);
    room.phase = 'finished';
    room.winner = winner;
    room.endReason = reason;
    for (const p of room.players) {
      p.wasImpostor = p.impostor;
      if (winner && p.impostor === (winner === 'impostors')) p.points += POINTS.win;
    }
    this.onCards(room);
    this.touch(room);
  }

  restart(room: Room) {
    if (room.phase !== 'finished') fail('Encerre a partida antes.');
    this.stopTimer(room);
    for (const p of room.players) Object.assign(p, { alive: true, points: 0, impostor: false, wasImpostor: undefined });
    Object.assign(room, {
      phase: 'lobby', round: 0, itemId: null, order: [], writeEndsAt: null, showAt: null, pausedAt: null, voteEndsAt: null,
      result: null, winner: null, endReason: null,
    });
    room.phrases.clear();
    room.votes.clear();
    this.touch(room);
  }

  view(room: Room): PublicRoom {
    const open = room.phase !== 'lobby' && room.phase !== 'writing';
    return {
      code: room.code, phase: room.phase, serverNow: this.clock.now(), settings: room.settings, round: room.round,
      players: room.players.map(({ id, name, avatar, alive, online, points, wasImpostor }) => ({
        id, name, avatar, alive, online, points, ...(wasImpostor !== undefined && { wasImpostor }),
      })),
      writeEndsAt: room.writeEndsAt,
      submitted: room.phase === 'writing' ? [...room.phrases.keys()] : [],
      // Item e frases só saem depois que todos escreveram.
      itemId: open ? room.itemId : null,
      phrases: open ? room.order.map((id) => ({ playerId: id, text: room.phrases.get(id) ?? '' })) : [],
      showAt: room.showAt, pausedAt: room.pausedAt, voteEndsAt: room.voteEndsAt,
      voted: room.phase === 'voting' ? [...room.votes.keys()] : [],
      result: room.result, winner: room.winner, endReason: room.endReason,
    };
  }
}
