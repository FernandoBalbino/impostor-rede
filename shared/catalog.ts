// Itens das rodadas. O foco é rede; algumas peças de hardware entram para revisar.
// As 27 primeiras seguem a ordem das folhas geradas (scripts/cut-sprites.py); as outras vêm do LeilãoTEC.
// As dicas do impostor ficam só no servidor (server/hints.ts) para não vazarem no site.

export type Category = 'rede' | 'conceito' | 'hardware';

export interface Item {
  id: string;
  name: string;
  category: Category;
  summary: string; // para que serve, em linguagem simples
}

export const CATEGORY_LABEL: Record<Category, string> = {
  rede: 'Aparelho de rede',
  conceito: 'Palavra de rede',
  hardware: 'Peça do computador',
};

const i = (id: string, name: string, category: Category, summary: string): Item => ({ id, name, category, summary });

export const ITEMS: Item[] = [
  // Folha 1
  i('switch', 'Switch', 'rede', 'Liga vários computadores da mesma rede por cabo e entrega cada mensagem só para quem deve receber.'),
  i('placa-rede', 'Placa de rede', 'rede', 'Peça do computador onde entra o cabo de rede. Sem ela, o PC não conversa com a rede.'),
  i('adaptador-wifi', 'Adaptador Wi-Fi USB', 'rede', 'Liga na entrada USB e dá Wi-Fi a um computador que não tem.'),
  i('modem', 'Modem', 'rede', 'Traz a internet da operadora (pela fibra ou pelo cabo) para dentro da casa ou da empresa.'),
  i('ponto-acesso', 'Ponto de acesso', 'rede', 'Espalha o sinal Wi-Fi em lugares grandes, como escolas e empresas. Costuma ficar no teto.'),
  i('repetidor', 'Repetidor de Wi-Fi', 'rede', 'Pega o sinal do Wi-Fi e repete mais adiante, para chegar aos cômodos longe do roteador.'),
  i('cabo-rede', 'Cabo de rede', 'rede', 'Leva os dados de um aparelho ao outro por fio. É mais estável que o Wi-Fi.'),
  i('rj45', 'Conector RJ45', 'rede', 'A pontinha transparente do cabo de rede, com 8 fios coloridos dentro.'),
  i('alicate', 'Alicate de crimpar', 'rede', 'Ferramenta que prende o conector RJ45 na ponta do cabo de rede.'),
  // Folha 2
  i('testador', 'Testador de cabo', 'rede', 'Confere se os fios do cabo de rede estão certos: as luzes acendem em ordem quando o cabo está bom.'),
  i('fibra', 'Fibra óptica', 'rede', 'Cabo que leva a internet usando luz. É muito rápido e alcança longas distâncias.'),
  i('patch-panel', 'Patch panel', 'rede', 'Painel que organiza a chegada dos cabos de rede dentro do rack.'),
  i('rack', 'Rack de rede', 'rede', 'Armário de metal que guarda e protege os aparelhos de rede, como o switch e o servidor.'),
  i('servidor', 'Servidor', 'rede', 'Computador potente que fica ligado o tempo todo oferecendo sites, arquivos ou sistemas para a rede.'),
  i('camera-ip', 'Câmera IP', 'rede', 'Câmera de segurança que manda as imagens pela rede. Dá para assistir de longe, pelo celular.'),
  i('tomada-rede', 'Tomada de rede', 'rede', 'Ponto na parede onde se encaixa o cabo de rede. O cabo segue escondido até o rack.'),
  i('hub', 'Hub', 'rede', 'O "avô" do switch: repete tudo para todas as portas, sem escolher quem recebe. Deixa a rede lenta.'),
  i('celular', 'Celular', 'rede', 'Aparelho de bolso que entra na internet pelo Wi-Fi ou pelos dados móveis (4G e 5G).'),
  // Folha 3
  i('ip', 'IP', 'conceito', 'O endereço de cada aparelho na rede. Funciona como o número da casa: é por ele que a mensagem chega certo.'),
  i('wifi', 'Wi-Fi', 'conceito', 'Rede sem fio: liga os aparelhos usando ondas de rádio, sem precisar de cabo.'),
  i('internet', 'Internet', 'conceito', 'A rede gigante que liga computadores do mundo inteiro.'),
  i('nuvem', 'Nuvem', 'conceito', 'Guardar arquivos e usar programas em computadores de outra empresa, pela internet. Ex.: Google Drive.'),
  i('senha', 'Senha do Wi-Fi', 'conceito', 'Protege a rede sem fio: só entra quem sabe a senha.'),
  i('firewall', 'Firewall', 'conceito', 'O "porteiro" da rede: deixa passar o que é permitido e bloqueia o que é perigoso.'),
  i('velocidade', 'Velocidade da internet', 'conceito', 'Quanto dado chega por segundo. É medida em megas (Mbps): quanto mais, mais rápido.'),
  i('ping', 'Ping', 'conceito', 'Teste que manda um "oi" para outro aparelho e mede quanto tempo a resposta demora.'),
  i('download', 'Download', 'conceito', 'Baixar: trazer um arquivo da internet para o seu aparelho.'),
  // Do LeilãoTEC
  i('roteador', 'Roteador', 'rede', 'Liga a rede da casa à internet, cria o Wi-Fi e escolhe o caminho dos dados.'),
  i('nobreak', 'Nobreak', 'hardware', 'Bateria que mantém o computador e a rede ligados por um tempo quando a energia cai.'),
  i('hd', 'HD', 'hardware', 'Guarda arquivos e programas mesmo com o computador desligado. Tem um disco que gira.'),
  i('ssd', 'SSD', 'hardware', 'Guarda arquivos como o HD, mas sem peças girando. É bem mais rápido.'),
  i('ram', 'Memória RAM', 'hardware', 'Memória rápida que guarda o que está aberto agora. Perde tudo quando desliga.'),
  i('processador', 'Processador', 'hardware', 'O "cérebro" do computador: faz as contas e executa os programas.'),
  i('placa-mae', 'Placa-mãe', 'hardware', 'A placa principal: todas as peças se encaixam nela e conversam por ela.'),
  i('fonte', 'Fonte', 'hardware', 'Transforma a energia da tomada e alimenta todas as peças do computador.'),
  i('teclado', 'Teclado', 'hardware', 'Serve para digitar letras, números e atalhos.'),
  i('mouse', 'Mouse', 'hardware', 'Move a setinha na tela e clica nas coisas.'),
  i('monitor', 'Monitor', 'hardware', 'A tela onde aparece a imagem do computador.'),
  i('pendrive', 'Pen drive', 'hardware', 'Memória pequena que liga na USB para levar arquivos de um lugar a outro.'),
  i('webcam', 'Webcam', 'hardware', 'Câmera do computador para chamadas de vídeo.'),
  i('impressora', 'Impressora', 'hardware', 'Passa para o papel o que está no computador. Muitas funcionam pela rede ou pelo Wi-Fi.'),
  i('placa-video', 'Placa de vídeo', 'hardware', 'Cria as imagens que aparecem no monitor. Muito importante para jogos.'),
  i('cooler', 'Cooler', 'hardware', 'Ventilador que esfria o processador para ele não esquentar demais.'),
];

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

// Tira acentos e caixa para comparar textos ("Câmera" = "camera").
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// A frase não pode dizer o nome do item (checado no navegador de quem conhece o nome).
export function saysName(text: string, name: string) {
  const words = ` ${normalize(text).replace(/[^a-z0-9]+/g, ' ')} `;
  return words.includes(` ${normalize(name).replace(/[^a-z0-9]+/g, ' ').trim()} `);
}
