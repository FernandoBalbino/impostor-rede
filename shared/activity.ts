// Trilha /atividade: prepara a turma para o jogo, com três tipos de missão:
// - write: cartões de estudo + pergunta respondida com as palavras do aluno (mínimo de 50 letras);
// - match: arrastar a imagem de cada aparelho até o bloco com a função certa;
// - impostor: rodada de treino. O aluno vê o item (como a turma), lê 3 frases e escreve o nome do impostor.
// Juntas, as 10 missões passam por todos os 43 itens do catálogo (há teste para isso).
import { ITEM_BY_ID, normalize, saysName } from './catalog.ts';
import type { Help } from './protocol.ts';

export const MIN_LETTERS = 50;
const MIN_WORDS = 6; // palavras diferentes: barra "aaaaaaaa…" para completar as letras
const COPY_RUN = 7; // 7 palavras seguidas iguais às de um cartão = copiou o cartão
export const MIN_GUESS_LETTERS = 25; // acusação: o nome e o motivo, numa frase curta
const MIN_GUESS_WORDS = 4;

export interface Suspect {
  name: string; // nome simples, de um jeito só de escrever: é ele que o aluno digita
  avatar: number;
  phrase: string; // até 80 letras, sem o nome do item, como no jogo
  note?: string; // inocentes: por que a frase combina com o item (aparece se o aluno acusar errado)
}

export interface Round {
  itemId: string;
  help: Exclude<Help, 'sortear'>; // a ajuda que o impostor recebeu (é revelada no fim)
  decoy?: string; // pixel e dupla: o item que o impostor achou que era
  suspects: Suspect[];
  impostor: number; // índice em suspects
  reveal: string;
}

interface Base {
  emoji: string;
  title: string;
  items: string[]; // itens que o aluno vê na missão
  question: string; // no match e no impostor, é a instrução
  tip: string;
}

export type Mission = (Base & { kind: 'write' | 'match' }) | (Base & { kind: 'impostor'; round: Round });

const training = (n: number, round: Round, tip: string): Mission => ({
  kind: 'impostor',
  emoji: '🕵️',
  title: `Rodada de treino ${n}`,
  items: [round.itemId, ...(round.decoy ? [round.decoy] : [])],
  question: 'Simulação de uma rodada: você é da turma e recebeu o item abaixo. Leia as frases que apareceram na TV e descubra quem não sabia o item.',
  tip,
  round,
});

export const MISSIONS: Mission[] = [
  {
    kind: 'write', emoji: '🌐', title: 'A internet chega em casa', items: ['internet', 'fibra', 'modem', 'roteador'],
    question: 'Explique o caminho da internet desde a rua até o celular na sua casa. Diga para que servem o modem e o roteador nesse caminho.',
    tip: 'O modem traz a internet da operadora para dentro de casa; o roteador distribui para os aparelhos e cria o Wi-Fi. Muita gente confunde os dois!',
  },
  {
    kind: 'match', emoji: '🔌', title: 'A sala ligada por cabo', items: ['switch', 'hub', 'placa-rede', 'cabo-rede', 'rj45', 'tomada-rede'],
    question: 'Arraste cada aparelho até a função certa.',
    tip: 'O switch entrega cada mensagem só para quem deve receber. O hub manda tudo para todo mundo, e a rede fica lenta.',
  },
  {
    kind: 'match', emoji: '📶', title: 'Rede sem fio', items: ['wifi', 'ponto-acesso', 'repetidor', 'adaptador-wifi', 'celular'],
    question: 'Arraste cada item até a função certa.',
    tip: 'Repetidor e ponto de acesso levam o sinal mais longe. O adaptador Wi-Fi USB dá Wi-Fi a um computador que não tem.',
  },
  training(1, {
    itemId: 'camera-ip', help: 'dica', impostor: 1,
    suspects: [
      { name: 'Bia', avatar: 7, phrase: 'Fica no muro da escola filmando o portão o dia todo.', note: 'Filmar o portão o dia todo é o trabalho da Câmera IP.' },
      { name: 'Caio', avatar: 11, phrase: 'É muito útil e hoje em dia quase todo mundo tem um.' },
      { name: 'Nina', avatar: 27, phrase: 'Dá para ver pelo celular o que ela grava, mesmo de longe.', note: 'A Câmera IP manda as imagens pela rede, então dá para assistir pelo celular.' },
    ],
    reveal: 'Caio não viu o item. Recebeu só o tipo (aparelho de rede) e uma dica, ficou com medo de errar e escreveu uma frase que serve para quase tudo. Frase vaga demais é a marca do impostor.',
  }, 'No jogo, frase vaga demais chama atenção. Quando você for da turma, conte um detalhe certeiro (sem dizer o nome) para não levar voto à toa.'),
  {
    kind: 'match', emoji: '🧭', title: 'Endereço e segurança', items: ['ip', 'download', 'firewall', 'senha', 'nuvem'],
    question: 'Arraste cada item até a função certa.',
    tip: 'O IP é o endereço do aparelho, o firewall é o porteiro da rede e a nuvem é um computador de outra empresa, acessado pela internet.',
  },
  {
    kind: 'match', emoji: '🧰', title: 'Sala de rede e ferramentas', items: ['rack', 'patch-panel', 'servidor', 'nobreak', 'alicate', 'testador'],
    question: 'Arraste cada equipamento até a função certa.',
    tip: 'Alicate prende o RJ45 no cabo, o testador confere se os fios ficaram certos e o rack guarda tudo organizado e protegido.',
  },
  training(2, {
    itemId: 'ping', help: 'dupla', decoy: 'velocidade', impostor: 2,
    suspects: [
      { name: 'Davi', avatar: 13, phrase: 'Quem joga online quer esse número bem baixinho, senão dá lag.', note: 'Ping baixo = resposta rápida. É isso que quem joga online quer.' },
      { name: 'Enzo', avatar: 19, phrase: 'No prompt de comando, mostra se o site responde e em quantos ms.', note: 'No prompt de comando, o ping manda um “oi” e mostra em quantos milissegundos (ms) a resposta volta.' },
      { name: 'Lara', avatar: 24, phrase: 'Quanto mais megas você contrata, maior e melhor ele fica.' },
    ],
    reveal: 'Lara recebeu duas imagens, Ping e Velocidade da internet, e apostou na errada. Os megas contratados são a velocidade. O ping mede o tempo da resposta, e quanto menor, melhor.',
  }, 'No modo “dois itens”, o impostor tem metade da chance de acertar. Compare os detalhes: quem descreveu o item parecido é o impostor.'),
  {
    kind: 'match', emoji: '🧠', title: 'Dentro do computador', items: ['processador', 'placa-mae', 'ram', 'fonte', 'placa-video', 'cooler'],
    question: 'Arraste cada peça até a função certa.',
    tip: 'A RAM é rápida mas esquece tudo ao desligar. O cooler esfria o processador e a fonte alimenta todas as peças.',
  },
  {
    kind: 'match', emoji: '🖱️', title: 'Periféricos', items: ['teclado', 'mouse', 'monitor', 'webcam', 'impressora', 'pendrive'],
    question: 'Arraste cada aparelho até a função certa.',
    tip: 'Agora a última rodada de treino. Leia com atenção: o impostor pode falar de uma peça parecida.',
  },
  training(3, {
    itemId: 'ssd', help: 'pixel', decoy: 'hd', impostor: 0,
    suspects: [
      { name: 'Igor', avatar: 26, phrase: 'Tem um disco lá dentro que gira bem rápido para ler os arquivos.' },
      { name: 'Malu', avatar: 3, phrase: 'Troquei o do meu PC e agora o Windows liga em poucos segundos.', note: 'Deixar o computador ligar rápido é a fama do SSD: ele é bem mais rápido que o HD.' },
      { name: 'Luna', avatar: 32, phrase: 'Guarda as fotos e os jogos mesmo com o computador desligado.', note: 'Guardar arquivos com o PC desligado é coisa do SSD (o HD também faz isso). A frase está certa, só não é a mais específica.' },
    ],
    reveal: 'Igor só viu a imagem pixelada: uma caixinha retangular. Achou que era um HD e falou do disco que gira. Só que o SSD não tem nenhuma peça girando!',
  }, 'Pronto para o jogo! Descreva a função sem dizer o nome e desconfie de quem fala de um detalhe que não combina com o item.'),
];

export const countLetters = (text: string) => (text.match(/\p{L}/gu) ?? []).length;

const words = (text: string) => normalize(text).match(/[a-z0-9]+/g) ?? [];
const distinctWords = (text: string) => new Set(words(text).filter((w) => w.length > 1)).size;

// Retorna o aviso que impede o envio, ou '' se a resposta pode ser enviada.
export function checkAnswer(text: string, mission: Mission): string {
  if (countLetters(text) < MIN_LETTERS) return '';
  if (distinctWords(text) < MIN_WORDS) return 'Escreva frases de verdade, com pelo menos 6 palavras diferentes.';
  const answer = ` ${words(text).join(' ')} `;
  for (const id of mission.items) {
    const card = words(ITEM_BY_ID[id].summary);
    for (let k = 0; k + COPY_RUN <= card.length; k++)
      if (answer.includes(` ${card.slice(k, k + COPY_RUN).join(' ')} `)) return 'Parece que você copiou o texto do cartão. Explique com as suas palavras.';
  }
  return '';
}

// Acusação da rodada de treino: o voto é o nome escrito na frase (sem ligar para acento e maiúscula).
// named = jogadores citados; ready = pode acusar (um nome só, com o motivo).
export function checkGuess(text: string, round: Round) {
  const named = round.suspects.flatMap((s, k) => (saysName(text, s.name) ? [k] : []));
  const problem = countLetters(text) >= MIN_GUESS_LETTERS && distinctWords(text) < MIN_GUESS_WORDS
    ? 'Escreva uma frase de verdade: o nome de quem você acusa e o motivo.'
    : '';
  const ready = countLetters(text) >= MIN_GUESS_LETTERS && !problem && named.length === 1;
  return { named, problem, ready, right: ready && named[0] === round.impostor };
}
