import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, GameError, POINTS, type Clock, type Room } from '../server/game.ts';
import { HINTS } from '../server/hints.ts';
import { ITEMS, ITEM_BY_ID, saysName } from '../shared/catalog.ts';
import { INTRO_MS, MAX_ROUNDS, PHRASE_MS, RESULT_MS, VOTE_MS, showIndex, type Help } from '../shared/protocol.ts';

function fakeClock(seed = 1) {
  let now = 1_000_000;
  let s = seed;
  const timers: { at: number; fn: () => void; id: number }[] = [];
  let id = 0;
  const clock: Clock = {
    now: () => now,
    set: (fn, ms) => (timers.push({ at: now + ms, fn, id: ++id }), id),
    clear: (h) => {
      const k = timers.findIndex((t) => t.id === h);
      if (k >= 0) timers.splice(k, 1);
    },
    random: () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646,
  };
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > end) break;
      timers.shift();
      now = next.at;
      next.fn();
    }
    now = end;
  };
  return { clock, advance };
}

function setup(players = 5, impostors = 1, help: Help = 'sortear', seed = 1) {
  const { clock, advance } = fakeClock(seed);
  const game = new Game({ clock });
  const room = game.createRoom({ impostors, writeSeconds: 60, help });
  const ps = Array.from({ length: players }, (_, k) => game.join(room.code, `Aluno ${k + 1}`).player);
  return { game, room, ps, advance };
}

const internal = (room: Room) => room.players;
const impostorsOf = (room: Room) => internal(room).filter((p) => p.impostor);
const crewOf = (room: Room) => internal(room).filter((p) => !p.impostor);

function writeAll(game: Game, room: Room) {
  for (const p of internal(room)) if (p.alive && !room.phrases.has(p.id)) game.submitPhrase(room, p.id, `frase de ${p.name}`);
}

function voteOut(game: Game, room: Room, targetId: string) {
  for (const p of internal(room)) if (p.alive) game.vote(room, p.id, p.id === targetId ? 'skip' : targetId);
}

test('catálogo: 43 itens, ids únicos, toda peça tem dica e imagem pixelada', async () => {
  const { readFileSync } = await import('node:fs');
  const pixels = JSON.parse(readFileSync(new URL('../server/pixels.json', import.meta.url), 'utf8'));
  assert.equal(ITEMS.length, 43);
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, 43);
  assert.ok(ITEMS.filter((i) => i.category !== 'hardware').length > ITEMS.length / 2, 'o foco é rede');
  for (const it of ITEMS) {
    assert.ok(HINTS[it.id], `sem dica: ${it.id}`);
    assert.match(pixels[it.id], /^data:image\/png;base64,/);
    assert.ok(!saysName(HINTS[it.id], it.name), `a dica entrega o nome: ${it.id}`);
  }
});

test('saysName ignora acentos e caixa e só pega a palavra inteira', () => {
  assert.ok(saysName('A camera ip filma tudo', 'Câmera IP'));
  assert.ok(saysName('serve pra dar ip', 'IP'));
  assert.ok(!saysName('tipo um endereço', 'IP'));
});

test('nome obrigatório, avatares diferentes e sala fechada depois do início', () => {
  const { game, room, ps } = setup(5);
  assert.throws(() => game.join(room.code, '  '), GameError);
  assert.throws(() => game.join(room.code, 'a'), GameError);
  assert.equal(new Set(ps.map((p) => p.avatar)).size, 5);
  game.join(room.code, 'Júlia');
  assert.equal(game.join(room.code, 'júlia').player.name, 'júlia 2');
  game.start(room);
  assert.throws(() => game.join(room.code, 'Atrasado'), /já começou/);
});

test('36 alunos recebem 36 avatares diferentes', () => {
  const { room } = setup(36);
  assert.equal(new Set(room.players.map((p) => p.avatar)).size, 36);
});

test('número de impostores escolhido e mínimo de alunos', () => {
  const { game, room } = setup(6, 3);
  assert.throws(() => game.start(room), /pelo menos 7/);
  game.setSettings(room, { impostors: 2, writeSeconds: 60, help: 'dica' });
  game.start(room);
  assert.equal(impostorsOf(room).length, 2);
  assert.throws(() => game.setSettings(room, { impostors: 1, writeSeconds: 60, help: 'dica' }), GameError);
});

test('o impostor nunca recebe o id do item; os aliados se conhecem', () => {
  for (const help of ['dica', 'pixel', 'dupla'] as const) {
    const { game, room } = setup(7, 2, help);
    game.start(room);
    const [a, b] = impostorsOf(room);
    const card = game.card(room, a.id)!;
    assert.equal(card.role, 'impostor');
    if (card.role !== 'impostor') continue;
    assert.deepEqual(card.allies, [b.id]);
    const json = JSON.stringify(card);
    if (help === 'dupla') {
      assert.equal(card.help, 'dupla');
      assert.ok(card.help === 'dupla' && card.options.includes(room.itemId!));
      assert.equal(ITEM_BY_ID[(card as { options: string[] }).options.find((o) => o !== room.itemId)!].category, ITEM_BY_ID[room.itemId!].category);
    } else assert.ok(!json.includes(`"${room.itemId}"`), `${help} vazou o id`);
    const crew = game.card(room, crewOf(room)[0].id)!;
    assert.deepEqual(crew, { round: 1, role: 'crew', itemId: room.itemId });
    // Estado público não mostra o item nem as frases enquanto escrevem.
    const v = game.view(room);
    assert.equal(v.itemId, null);
    assert.ok(!JSON.stringify(v).includes('wasImpostor'));
  }
});

test('escrita: frase validada, todos mandaram → falas com item; 10 s por fala → votação', () => {
  const { game, room, advance } = setup(5);
  game.start(room);
  const [p1] = internal(room);
  assert.throws(() => game.submitPhrase(room, p1.id, 'oi'), /pelo menos 3/);
  assert.throws(() => game.submitPhrase(room, p1.id, 'x'.repeat(81)), /no máximo/);
  game.submitPhrase(room, p1.id, '  liga   tudo  ');
  assert.throws(() => game.submitPhrase(room, p1.id, 'de novo'), /já mandou/);
  assert.deepEqual(game.view(room).submitted, [p1.id]);
  writeAll(game, room);
  const v = game.view(room);
  assert.equal(v.phase, 'reveal');
  assert.equal(v.itemId, room.itemId);
  assert.equal(v.phrases.length, 5);
  assert.equal(v.phrases.find((f) => f.playerId === p1.id)!.text, 'liga tudo');
  assert.equal(showIndex(v, room.showAt! - 1), -1);
  assert.equal(showIndex(v, room.showAt! + PHRASE_MS * 2 + 5), 2);
  advance(INTRO_MS + 5 * PHRASE_MS - 1);
  assert.equal(room.phase, 'reveal');
  advance(1);
  assert.equal(room.phase, 'voting');
});

test('tempo de escrita acaba: quem não escreveu fica com frase vazia', () => {
  const { game, room, advance } = setup(5);
  game.start(room);
  game.submitPhrase(room, room.players[0].id, 'uma frase');
  advance(60_000);
  assert.equal(room.phase, 'reveal');
  assert.equal(game.view(room).phrases.filter((f) => f.text === '').length, 4);
});

test('controles da TV: pausar segura a votação; avançar e voltar mudam a fala', () => {
  const { game, room, advance } = setup(5);
  game.start(room);
  writeAll(game, room);
  advance(INTRO_MS + 1000);
  game.showControl(room, 'pause');
  advance(10 * PHRASE_MS);
  assert.equal(room.phase, 'reveal');
  assert.equal(showIndex(room, game.clock.now()), 0);
  game.showControl(room, 'resume');
  game.showControl(room, 'next');
  assert.equal(showIndex(room, game.clock.now()), 1);
  game.showControl(room, 'prev');
  game.showControl(room, 'prev');
  assert.equal(showIndex(room, game.clock.now()), -1);
  for (let k = 0; k < 6; k++) if (room.phase === 'reveal') game.showControl(room, 'next');
  assert.equal(room.phase, 'voting');
});

test('votação: não vota em si, pula, empate não elimina, mais votado sai e o resultado diz se era impostor', () => {
  const { game, room } = setup(5);
  game.start(room);
  writeAll(game, room);
  game.openVote(room);
  const [imp] = impostorsOf(room);
  const crew = crewOf(room);
  assert.throws(() => game.vote(room, crew[0].id, crew[0].id), /você mesmo/);
  // Empate 2 x 2 (+1 pulou): ninguém sai.
  game.vote(room, crew[0].id, crew[1].id);
  game.vote(room, crew[1].id, crew[0].id);
  game.vote(room, crew[2].id, crew[1].id);
  game.vote(room, crew[3].id, crew[0].id);
  game.vote(room, imp.id, 'skip');
  assert.equal(room.phase, 'result');
  assert.equal(room.result!.eliminatedId, null);
  assert.equal(room.result!.skip, 1);
  assert.equal(imp.points, POINTS.impostorRound);
  game.nextRound(room);
  assert.equal(room.round, 2);
  writeAll(game, room);
  game.openVote(room);
  voteOut(game, room, crew[0].id);
  assert.equal(room.result!.eliminatedId, crew[0].id);
  assert.equal(room.result!.wasImpostor, false);
  assert.equal(game.view(room).players.find((p) => p.id === crew[0].id)!.wasImpostor, false);
  assert.equal(game.card(room, crew[0].id), null, 'eliminado não recebe o item');
});

test('pular ganha do mais votado: ninguém sai', () => {
  const { game, room } = setup(5);
  game.start(room);
  writeAll(game, room);
  game.openVote(room);
  const [a, b, c, d, e] = internal(room);
  game.vote(room, a.id, b.id);
  for (const p of [b, c, d, e]) game.vote(room, p.id, 'skip');
  assert.equal(room.result!.eliminatedId, null);
});

test('impostor eliminado: alunos vencem, pontos de voto certo e de vitória, pódio', () => {
  const { game, room, advance } = setup(5);
  game.start(room);
  writeAll(game, room);
  game.openVote(room);
  const [imp] = impostorsOf(room);
  voteOut(game, room, imp.id);
  assert.equal(room.result!.wasImpostor, true);
  assert.equal(room.result!.impostorsLeft, 0);
  assert.throws(() => game.nextRound(room), /acabou/);
  advance(RESULT_MS);
  assert.equal(room.phase, 'finished');
  assert.equal(room.winner, 'crew');
  assert.equal(room.endReason, 'caught');
  for (const p of crewOf(room)) assert.equal(p.points, POINTS.rightVote + POINTS.win);
  assert.equal(imp.points, 0);
  assert.ok(game.view(room).players.every((p) => p.wasImpostor !== undefined));
});

test('impostor vence quando sobra só ele + 1 aluno', () => {
  const { game, room, advance } = setup(3);
  game.start(room);
  writeAll(game, room);
  game.openVote(room);
  const [c1] = crewOf(room);
  voteOut(game, room, c1.id);
  advance(RESULT_MS);
  assert.equal(room.winner, 'impostors');
  assert.equal(room.endReason, 'outnumbered');
});

test('impostor vence ao chegar em 20 rodadas', () => {
  const { game, room, advance } = setup(5);
  game.start(room);
  for (let r = 1; r <= MAX_ROUNDS; r++) {
    writeAll(game, room);
    game.openVote(room);
    for (const p of internal(room)) game.vote(room, p.id, 'skip');
    if (r < MAX_ROUNDS) game.nextRound(room);
  }
  assert.equal(room.round, MAX_ROUNDS);
  advance(RESULT_MS);
  assert.equal(room.winner, 'impostors');
  assert.equal(room.endReason, 'rounds');
});

test('itens não se repetem antes de acabar o baralho', () => {
  const { game, room } = setup(5);
  game.start(room);
  const seen = [room.itemId];
  for (let r = 1; r < 20; r++) {
    writeAll(game, room);
    game.openVote(room);
    for (const p of internal(room)) game.vote(room, p.id, 'skip');
    game.nextRound(room);
    seen.push(room.itemId);
  }
  assert.equal(new Set(seen).size, 20);
});

test('aluno desconectado não trava a escrita nem a votação', () => {
  const { game, room } = setup(5);
  game.start(room);
  const [a, ...rest] = internal(room);
  game.setOnline(room, a.id, false);
  for (const p of rest) game.submitPhrase(room, p.id, 'frase boa');
  assert.equal(room.phase, 'reveal');
  game.openVote(room);
  for (const p of rest) game.vote(room, p.id, 'skip');
  assert.equal(room.phase, 'result');
});

test('nova partida volta ao lobby com os mesmos alunos e zera tudo', () => {
  const { game, room } = setup(5);
  game.start(room);
  game.finish(room, null, 'teacher');
  game.restart(room);
  assert.equal(room.phase, 'lobby');
  assert.equal(room.players.length, 5);
  assert.ok(room.players.every((p) => p.alive && !p.impostor && p.points === 0));
  const v = game.view(room);
  assert.ok(v.players.every((p) => p.wasImpostor === undefined));
});

test('votação fecha sozinha no fim do tempo', () => {
  const { game, room, advance } = setup(5);
  game.start(room);
  writeAll(game, room);
  game.openVote(room);
  advance(VOTE_MS);
  assert.equal(room.phase, 'result');
});
