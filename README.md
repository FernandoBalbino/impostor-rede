# Impostor da Rede

Jogo de dedução em tempo real para revisar **aparelhos de rede** e **peças do computador**. Todos recebem o mesmo item (imagem grande, nome e para que serve) e escrevem uma frase sobre ele. O impostor não vê o item: ganha só uma ajuda. A TV mostra o item e a fala de cada um, e a turma vota no Chromebook em quem está blefando.

Componentes: **Redes de Computadores** (equipamentos: roteador, switch, modem; Wi-Fi; segurança com firewall) e **Diagnóstico de Sistemas e Redes** (testador de cabo, ping), com revisão de hardware.

- **Jogar:** https://fernandobalbino.github.io/impostor-rede/
- **Atividade de preparação (Chromebook):** https://fernandobalbino.github.io/impostor-rede/atividade
- **Servidor (Render):** https://impostor-rede.onrender.com/health

## Antes do jogo: /atividade

Trilha de 8 missões para a turma chegar ao jogo sabendo a função de cada item, mesmo quem não sabe nada. Juntas, as missões passam pelos 43 itens.

- **4 missões de escrever (✍️):** cartões de estudo (imagem, nome e para que serve) e uma pergunta para responder com as próprias palavras. Mínimo de **50 letras** (só letras contam). Colar, arrastar texto e copiar ficam bloqueados. A resposta também não passa se repetir 7 palavras seguidas do cartão ou se tiver menos de 6 palavras diferentes.
- **4 missões de arrastar (🧩):** 5 ou 6 imagens de um lado e as funções do outro. O aluno arrasta cada imagem até a função certa (mouse, touchpad ou toque), ou clica na imagem e depois na função. Errou: a função treme e a imagem volta.
- Cada missão cumprida mostra uma dica. No fim, o botão **Entrar na sala do jogo** abre direto o formulário de código e nome.
- As respostas ficam só no navegador do aluno (`sessionStorage`), sem usar o Render. Fechar a aba recomeça a trilha, para o próximo aluno do Chromebook.

## Como funciona

1. **Professor:** "Sou professor" → escolhe **quantos impostores** (1 a 3), o tempo para escrever (45 a 120 s) e a **ajuda do impostor**. Passa a tela na TV.
2. **Alunos:** entram com o código de 4 letras e um **nome obrigatório**. Cada um recebe um **robô diferente** (36 avatares), para se achar na TV.
3. **Escrita:** cada aluno vê o item e escreve uma frase de até 80 letras, **sem dizer o nome** (o Chromebook bloqueia a frase com o nome). A TV mostra quem já enviou.
4. **TV:** primeiro o **item grande** (6 s), depois **a fala de cada um por 10 s**, com animação. O professor pode pausar, voltar, avançar ou abrir a votação antes.
5. **Votação (60 s):** a TV mostra o resumo das frases e quem já votou. No Chromebook, cada aluno vota em um colega ou **pula o voto**.
6. **Resultado:** barras com os votos e a animação do eliminado ("desconectado da rede"). Mostra se **era ou não o impostor**. Empate, ou mais gente pulando do que votando no mais votado: ninguém sai.
7. **Fim:** os alunos vencem quando todos os impostores saem. O impostor vence se **sobrar só ele + 1 aluno** (com mais impostores: impostores ≥ alunos) ou ao chegar na **rodada 20**. A TV e os Chromebooks mostram a tela de vitória, quem era o impostor e o **pódio**. "Nova partida" volta ao lobby com a mesma turma.

### Ajuda do impostor

| Modo | O impostor recebe |
|---|---|
| Só uma dica escrita | O tipo (aparelho de rede, palavra de rede ou peça do computador) e uma frase que ajuda sem dar o nome |
| Imagem pixelada | O tipo e a foto do item em 10×10 pixels |
| Dois itens | Duas imagens com nome, do mesmo tipo; uma é a certa |
| Sortear a cada rodada | Um dos três acima, sorteado |

Com 2 ou 3 impostores, cada impostor vê quem são os parceiros.

### Pontos (pódio)

+100 por voto certo em um impostor · o impostor ganha +100 a cada votação que sobrevive · +300 para cada jogador do time que vence.

### Itens

43 itens: 18 aparelhos de rede (switch, placa de rede, adaptador Wi-Fi USB, modem, ponto de acesso, repetidor, cabo de rede, RJ45, alicate de crimpar, testador de cabo, fibra óptica, patch panel, rack, servidor, câmera IP, tomada de rede, hub, celular), 9 palavras de rede (IP, Wi-Fi, internet, nuvem, senha do Wi-Fi, firewall, velocidade da internet, ping, download), o roteador e 15 peças do computador (HD, SSD, memória RAM, processador, placa-mãe, fonte, teclado, mouse, monitor, pen drive, webcam, impressora, placa de vídeo, cooler e nobreak). Os itens não se repetem até acabar o baralho.

## Desenvolvimento

```bash
npm install
npm run dev:server   # Socket.IO em http://localhost:3000
npm run dev:web      # Vite em http://localhost:5173/impostor-rede/
npm run check        # TypeScript
npm test             # regras do jogo e da atividade (22 testes)
npm run e2e          # partida completa no Chrome com 5 alunos; prints em qa-evidence/
npm run e2e:atividade  # trilha /atividade no Chrome (colar bloqueado, arrastar, botão da sala)
```

- `shared/catalog.ts`: os 43 itens (nome, tipo e para que serve). `shared/protocol.ts`: tempos, tipos e eventos. `shared/activity.ts`: as missões da `/atividade` e as regras das respostas.
- `server/hints.ts`: as dicas do impostor. `server/pixels.json`: as imagens 10×10. Os dois ficam **só no servidor**, para ninguém achar a resposta no código do site.
- `server/game.ts`: as regras (sem rede, com relógio injetável). `server/index.ts`: Express + Socket.IO.
- `web/`: React + Vite. Imagens em `web/public/items/` e `avatars/`, sons em `web/public/sounds/`.
- Imagens: `scripts/cut-sprites.py` recorta as folhas 3×3 geradas por IA e gera o `pixels.json` (prompts em `docs/image-prompts.md`).

## Produção

- **GitHub Pages** (`.github/workflows/pages.yml`): a cada push em `main`, roda tipos e testes, faz o build e publica `dist/`. A URL do servidor vem da variável `VITE_SERVER_URL`.
- **Render** (`render.yaml`, plano free): `npm ci --omit=dev` + `node server/index.ts` (Node 24 roda TypeScript direto).
- **Banda do Render:** o servidor só troca mensagens pequenas. Imagens, sons e animações saem do GitHub Pages. Quando alguém envia a frase ou vota, vai só um aviso de poucos bytes (`mark`), não a sala inteira. O tempo das falas é calculado em cada navegador a partir de um horário único, sem mensagem a cada fala.
- O plano grátis dorme depois de 15 min sem uso: a página inicial já acorda o servidor, e a tela do professor manda um ping a cada 4 min durante a aula.
- Salas ficam na memória do servidor (somem se ele reiniciar) e são apagadas após 4 h paradas.
- Teste leve em produção (3 alunos, 1 rodada, sem prints): `E2E_URL=https://fernandobalbino.github.io/impostor-rede/ LEVE=1 node scripts/e2e.ts`.
