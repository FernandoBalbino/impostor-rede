import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_BY_ID, saysName } from '../shared/catalog.ts';
import { MIN_GUESS_LETTERS, MIN_LETTERS, MISSIONS, checkAnswer, checkGuess, countLetters, type Round } from '../shared/activity.ts';
import { PHRASE_MAX, PHRASE_MIN } from '../shared/protocol.ts';

test('a trilha passa por todos os itens do jogo, sem repetir', () => {
  const ids = MISSIONS.flatMap((m) => m.items);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), ITEMS.map((i) => i.id).sort());
});

test('conta só letras (espaço, número e pontuação não contam)', () => {
  assert.equal(countLetters('Olá, mundo! 123 ç'), 9);
  assert.equal(MIN_LETTERS, 50);
});

test('resposta boa passa; repetir letras ou copiar o cartão não passa', () => {
  const m = MISSIONS[1]; // switch, hub, placa de rede…
  const good = 'O switch junta os computadores do laboratório e manda cada mensagem certinho, a placa de rede deixa o PC usar o cabo.';
  assert.ok(countLetters(good) >= MIN_LETTERS);
  assert.equal(checkAnswer(good, m), '');
  assert.match(checkAnswer('a'.repeat(30) + ' ' + 'b'.repeat(30), m), /palavras diferentes/);
  const copied = 'Eu acho que liga vários computadores da mesma rede por cabo e entrega cada mensagem certinho.';
  assert.match(checkAnswer(copied, m), /copiou/);
  assert.equal(checkAnswer('curta', m), '', 'abaixo do mínimo o contador já trava o envio');
});

test('uma missão de escrever, seis de arrastar e três rodadas de treino espalhadas pela trilha', () => {
  assert.deepEqual(MISSIONS.map((m) => m.kind), ['write', 'match', 'match', 'impostor', 'match', 'match', 'impostor', 'match', 'match', 'impostor']);
  for (const m of MISSIONS.filter((x) => x.kind === 'match')) {
    assert.ok(m.items.length >= 5 && m.items.length <= 6, m.title);
    // A função não pode entregar o nome do próprio item.
    for (const id of m.items) assert.ok(!saysName(ITEM_BY_ID[id].summary, ITEM_BY_ID[id].name), id);
  }
});

const rounds = MISSIONS.flatMap((m) => (m.kind === 'impostor' ? [m.round] : []));

test('rodadas de treino: frases como as do jogo e um impostor por rodada', () => {
  assert.equal(rounds.length, 3);
  assert.deepEqual(rounds.map((r) => r.help).sort(), ['dica', 'dupla', 'pixel'], 'uma rodada para cada ajuda do impostor');
  const allNames = rounds.flatMap((r) => r.suspects.map((s) => s.name));
  assert.equal(new Set(allNames).size, allNames.length, 'nomes diferentes em toda a trilha');
  for (const r of rounds) {
    const item = ITEM_BY_ID[r.itemId];
    assert.equal(r.suspects.length, 3);
    assert.ok(r.impostor >= 0 && r.impostor < 3);
    assert.equal(new Set(r.suspects.map((s) => (s.avatar - 1) % 9)).size, 3, 'robôs de cores diferentes (9 cores, ver avatarColor)');
    if (r.decoy) assert.equal(ITEM_BY_ID[r.decoy].category, item.category, 'como no jogo: o item falso é do mesmo tipo');
    else assert.equal(r.help, 'dica');
    for (const [k, s] of r.suspects.entries()) {
      assert.ok(s.phrase.length >= PHRASE_MIN && s.phrase.length <= PHRASE_MAX, s.phrase);
      for (const id of [r.itemId, r.decoy].filter(Boolean) as string[]) assert.ok(!saysName(s.phrase, ITEM_BY_ID[id].name), s.phrase);
      for (const other of allNames) assert.ok(!saysName(s.phrase, other), `a frase de ${s.name} cita ${other}`);
      assert.equal(!!s.note, k !== r.impostor, `${s.name}: só os inocentes têm explicação`);
    }
    assert.ok(r.reveal.includes(r.suspects[r.impostor].name));
  }
});

test('acusação: vale o nome escrito, um só, com o motivo', () => {
  const r: Round = rounds[0]; // Bia, Caio (impostor), Nina
  const guess = (t: string) => checkGuess(t, r);
  assert.equal(MIN_GUESS_LETTERS, 25);
  assert.deepEqual(guess('CAÍO é o impostor, a frase dele é vaga demais'), { named: [1], problem: '', ready: true, right: true });
  assert.deepEqual(guess('Acho que é a Bia, porque ela falou de filmar'), { named: [0], problem: '', ready: true, right: false });
  // Nome dentro de outra palavra não conta ("biela" não é Bia).
  assert.deepEqual(guess('A biela do motor não tem nada a ver com isso').named, []);
  // Dois nomes: não dá para acusar (senão era só citar todo mundo).
  const two = guess('Ou é o Caio ou é a Nina, as frases estão estranhas');
  assert.deepEqual(two.named, [1, 2]);
  assert.equal(two.ready, false);
  // Curta demais ou repetindo palavras: não acusa.
  assert.equal(guess('É o Caio').ready, false);
  const rep = guess('Caio caio caio caio caio caio caio');
  assert.equal(rep.ready, false);
  assert.match(rep.problem, /frase de verdade/);
});
