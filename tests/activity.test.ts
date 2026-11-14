import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, ITEM_BY_ID, saysName } from '../shared/catalog.ts';
import { MIN_LETTERS, MISSIONS, checkAnswer, countLetters } from '../shared/activity.ts';

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

test('metade das missões é de arrastar a imagem até a função, alternando com as de escrever', () => {
  assert.deepEqual(MISSIONS.map((m) => m.kind), ['write', 'match', 'write', 'match', 'write', 'match', 'write', 'match']);
  for (const m of MISSIONS.filter((x) => x.kind === 'match')) {
    assert.ok(m.items.length >= 5 && m.items.length <= 6, m.title);
    // A função não pode entregar o nome do próprio item.
    for (const id of m.items) assert.ok(!saysName(ITEM_BY_ID[id].summary, ITEM_BY_ID[id].name), id);
  }
});
