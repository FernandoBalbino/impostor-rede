# Créditos e licenças

## Imagens dos itens (`web/public/items/`)
- **27 itens de rede** (folhas 1 a 3 de `docs/image-prompts.md`): gerados por IA para este projeto com o modelo gpt-image-2.5-sunburst, via ElevenLabs, na conta do autor.
- **Roteador e peças do computador** (16 itens): as mesmas imagens do LeilãoTEC (mesmo modelo, ElevenLabs e Figma AI, na conta do autor).
- O recorte sem fundo e as miniaturas 10×10 do impostor foram feitos com `scripts/cut-sprites.py`. As imagens não contêm logotipos.

## Avatares (`web/public/avatars/`)
36 robôs gerados por IA para este projeto com o modelo gpt-image-2.5-sunburst, via Figma AI, na conta do autor (o limite diário do ElevenLabs grátis acabou nas folhas dos itens).

## Sons (`web/public/sounds/`)
- `revelar`, `fala`, `votacao`, `eliminado`, `vitoria`, `derrota`: gerados pelo autor no ElevenLabs Sound Effects (Text to Sound v2), conforme os termos da conta dele. Cortados e com volume igualado no ffmpeg.
- `contagem`: o mesmo do LeilãoTEC (ElevenLabs, conta do autor).

## Fontes
- Inter, de Rasmus Andersson: SIL Open Font License 1.1, via Google Fonts.
- Sora, de Jonathan Barnbrook e Julián Moncada: SIL Open Font License 1.1, via Google Fonts.

## Bibliotecas
| Pacote | Licença |
|---|---|
| React, React DOM | MIT |
| Socket.IO (servidor e cliente) | MIT |
| Express | MIT |
| Vite, @vitejs/plugin-react | MIT |
| canvas-confetti | ISC |
| Playwright (só testes) | Apache-2.0 |
| TypeScript (só desenvolvimento) | Apache-2.0 |
