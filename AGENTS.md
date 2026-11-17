# AGENTS.md — Impostor da Rede

Jogo de dedução em tempo real para turmas do técnico em Manutenção e Suporte de Informática. Professor na TV, alunos em Chromebook. Textos em português com acentos. Mesma base do LeilãoTEC.

## Arquitetura
- `shared/` é a fonte da verdade (catálogo, tempos, tipos do protocolo) e é importado pelo servidor e pela web.
- `server/game.ts` tem só regras, com relógio injetável (`Clock`). Teste toda regra nova em `tests/game.test.ts` com o `fakeClock`.
- O servidor é autoritativo: sorteia os impostores, valida frases e votos e decide eliminação e vitória.
- **Segredo do impostor:** o item vai só no evento `card`, para o próprio aluno. O impostor nunca recebe o `itemId` (exceto no modo "dois itens", junto com o item falso). `view()` só mostra `itemId` e as frases depois da escrita, e `wasImpostor` só de quem saiu (ou no fim). As dicas (`server/hints.ts`) e as imagens 10×10 (`server/pixels.json`) não podem ir para `shared/` nem para `web/`.
- A checagem "não diga o nome do item" é feita só no navegador de quem conhece o nome. Se o servidor recusasse, o impostor descobriria o item testando nomes.
- **Banda do Render:** `state` (sala inteira) só quando muda a fase ou algo raro. Frase enviada e voto viram `mark` (poucos bytes). As falas na TV usam `showAt`/`pausedAt` e `showIndex()`; não mande mensagem por fala.
- A tela do professor é a TV: nada secreto aparece nela.
- **Rotas:** `main.tsx` escolhe a página pelo caminho (`/atividade` → `Atividade.tsx`, resto → `App`). O GitHub Pages não tem fallback de SPA, então o `vite.config.ts` copia o `index.html` para `dist/<rota>/`. Rota nova = entrar nas duas listas.
- **/atividade:** missões em `shared/activity.ts`: 1 `write` (mínimo de 50 letras, sem colar), 6 `match` (arrastar com pointer events + clique) e 3 `impostor` (rodada de treino: o aluno escreve o nome do impostor; `checkGuess` aceita um nome só, com 25+ letras). As frases de treino são escritas à mão (não use `server/hints.ts`); a imagem pixelada do treino é feita no navegador a partir da miniatura. As missões juntas cobrem todos os itens do catálogo, sem repetir (há teste). Respostas só no `sessionStorage`; nada vai ao servidor.

## Regras de produto
- Cada fala fica 10 s na TV (`PHRASE_MS`), depois do item grande (`INTRO_MS`). Votação de 60 s, com "pular voto".
- Sai quem tiver mais votos sozinho e mais votos que o "pular". Empate: ninguém sai.
- Impostor vence com impostores ≥ alunos vivos (1 impostor: sobra ele + 1) ou na rodada 20 (`MAX_ROUNDS`).
- Nome obrigatório (2+ letras) e avatar único por aluno (36 robôs, `MAX_PLAYERS = 36`). Entrar só no lobby.
- Termos simples: "IP", não "IPv4". O foco é rede; hardware entra para revisar.
- Imagens: mesmo estilo 3D do LeilãoTEC, sem fundo, 512 px + miniatura de 160 px em WebP. Avatares em 256 px.
- Campos de texto sem exemplo dentro (placeholder): os alunos copiam o exemplo. Explique no rótulo.

## Desempenho (Chromebook)
- Anime só `transform`/`opacity` (exceção: o cinza do eliminado, uma vez). Respeite `prefers-reduced-motion`.
- TV em 1366×768 e 1920×1080, sem rolagem: a fonte da TV escala com `vw`, e as telas crescem quando há poucos alunos.

## Verificação
`npm run check && npm test && npm run build`, e depois `npm run e2e` com servidor e Vite locais. Em produção, faça só o teste leve (`LEVE=1`), porque a banda do Render é limitada (5 GB por mês).
