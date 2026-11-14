// Trilha /atividade: prepara a turma para o jogo, alternando dois tipos de missão:
// - write: cartões de estudo + pergunta respondida com as palavras do aluno (mínimo de 50 letras);
// - match: arrastar a imagem de cada aparelho até o bloco com a função certa.
// Juntas, as 8 missões passam por todos os 43 itens do catálogo (há teste para isso).
import { ITEM_BY_ID, normalize } from './catalog.ts';

export const MIN_LETTERS = 50;
const MIN_WORDS = 6; // palavras diferentes: barra "aaaaaaaa…" para completar as letras
const COPY_RUN = 7; // 7 palavras seguidas iguais às de um cartão = copiou o cartão

export interface Mission {
  kind: 'write' | 'match';
  emoji: string;
  title: string;
  items: string[];
  question: string; // no match, é a instrução
  tip: string;
}

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
    kind: 'write', emoji: '🧭', title: 'Endereço e testes', items: ['ip', 'ping', 'velocidade', 'download'],
    question: 'Explique com um exemplo do dia a dia o que é o IP de um aparelho. Depois diga para que serve o ping e por que quem joga online se preocupa com ele.',
    tip: 'O IP é como o número da casa: é por ele que a mensagem chega certo. Ping baixo = resposta rápida.',
  },
  {
    kind: 'match', emoji: '📶', title: 'Rede sem fio', items: ['wifi', 'ponto-acesso', 'repetidor', 'adaptador-wifi', 'celular'],
    question: 'Arraste cada item até a função certa.',
    tip: 'Repetidor e ponto de acesso levam o sinal mais longe. O adaptador Wi-Fi USB dá Wi-Fi a um computador que não tem.',
  },
  {
    kind: 'write', emoji: '🛡️', title: 'Segurança e nuvem', items: ['firewall', 'senha', 'nuvem', 'camera-ip'],
    question: 'Como o firewall e a senha do Wi-Fi ajudam a proteger uma rede? E o que quer dizer guardar um arquivo na nuvem?',
    tip: 'O firewall é o porteiro da rede e a senha decide quem entra. A nuvem é um computador de outra empresa, acessado pela internet.',
  },
  {
    kind: 'match', emoji: '🧰', title: 'Sala de rede e ferramentas', items: ['rack', 'patch-panel', 'servidor', 'nobreak', 'alicate', 'testador'],
    question: 'Arraste cada equipamento até a função certa.',
    tip: 'Alicate prende o RJ45 no cabo, o testador confere se os fios ficaram certos e o rack guarda tudo organizado e protegido.',
  },
  {
    kind: 'write', emoji: '🧠', title: 'Dentro do computador', items: ['processador', 'placa-mae', 'ram', 'hd', 'ssd', 'fonte', 'placa-video', 'cooler'],
    question: 'Para que servem o processador, a memória RAM e o SSD? Qual é a diferença entre a memória RAM e o SSD?',
    tip: 'A RAM é rápida mas esquece tudo ao desligar; o SSD e o HD guardam os arquivos mesmo desligados.',
  },
  {
    kind: 'match', emoji: '🖱️', title: 'Periféricos', items: ['teclado', 'mouse', 'monitor', 'webcam', 'impressora', 'pendrive'],
    question: 'Arraste cada aparelho até a função certa.',
    tip: 'Pronto! Você passou por todos os itens do jogo. Na hora de escrever a frase, lembre: descreva a função sem dizer o nome.',
  },
];

export const countLetters = (text: string) => (text.match(/\p{L}/gu) ?? []).length;

const words = (text: string) => normalize(text).match(/[a-z0-9]+/g) ?? [];

// Retorna o aviso que impede o envio, ou '' se a resposta pode ser enviada.
export function checkAnswer(text: string, mission: Mission): string {
  if (countLetters(text) < MIN_LETTERS) return '';
  if (new Set(words(text).filter((w) => w.length > 1)).size < MIN_WORDS) return 'Escreva frases de verdade, com pelo menos 6 palavras diferentes.';
  const answer = ` ${words(text).join(' ')} `;
  for (const id of mission.items) {
    const card = words(ITEM_BY_ID[id].summary);
    for (let k = 0; k + COPY_RUN <= card.length; k++)
      if (answer.includes(` ${card.slice(k, k + COPY_RUN).join(' ')} `)) return 'Parece que você copiou o texto do cartão. Explique com as suas palavras.';
  }
  return '';
}
