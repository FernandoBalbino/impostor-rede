# Design QA — Impostor da Rede

Prints em `qa-evidence/` (gerados por `npm run e2e`, TV e Chromebook em 1366×768, 5 alunos).

| Tela | Verificado | Print |
|---|---|---|
| Início | Título, peças flutuando, fundo de rede com pacotes correndo, escolha aluno/professor | `00-inicio` |
| Criar sala | Impostores 1–3 (com o mínimo de alunos), tempo para escrever, ajuda do impostor | `01-criar-sala` |
| Entrar (aluno) | Código e **nome obrigatório**, sem exemplo dentro dos campos | `02-entrar-aluno` |
| Lobby (TV) | Código gigante animado, regras editáveis, robôs entrando com "pop", botão travado até ter alunos suficientes | `03-lobby-tv`, `29-lobby-2-impostores-tv` |
| Lobby (aluno) | Robô próprio flutuando, 3 regras curtas | `04-lobby-aluno` |
| Escrita (TV) | Carta "?" flutuando, contagem, robôs com "digitando…" que vira ✓ verde | `05-escrevendo-tv`, `10-escrevendo-tv-progresso` |
| Item (aluno) | Imagem grande, nome, para que serve, campo da frase; frase com o nome é bloqueada | `06-aluno-item`, `08-aluno-nome-bloqueado`, `09-frase-enviada-aluno` |
| Impostor | Cartão vermelho com a ajuda: dica, imagem pixelada ou dois itens; parceiros quando há 2+ impostores | `07-impostor-dica`, `26-impostor-pixelado`, `30-impostor-dois-itens` |
| Item grande (TV) | Raios girando, item entra girando, nome e função em sequência | `11-item-grande-tv` |
| Fala (TV) | Robô entra pela esquerda, balão cresce, palavras aparecem uma a uma, barra de 10 s, pausa | `13-fala-tv` |
| Olhe a TV (aluno) | Olhos animados | `12-olhe-tv-aluno` |
| Votação (TV) | Resumo das frases, ✓ de quem votou, contagem | `14-votacao-tv` |
| Votação (aluno) | Cartões com a frase de cada colega, confirmar ou pular | `15-votacao-aluno`, `16-voto-enviado-aluno` |
| Resultado | Barras de votos crescendo (com "pularam"); robô treme, é "desplugado", fica cinza com OFFLINE; era/não era o impostor | `17-resultado-votos-tv`, `18-eliminado-tv`, `19-eliminado-aluno` |
| Eliminado | Só assiste, sem item | `20-espectador-aluno` |
| Impostor pego | Faixa vermelha pulsando e clarão na tela (TV e aluno) | `21-impostor-pego-tv`, `22-impostor-pego-aluno` |
| Fim | Faixa gigante, confete, quem era o impostor, pódio subindo e ranking; "seu time ganhou/perdeu" no aluno | `23-vitoria-podio-tv`, `24-vitoria-aluno`, `25-derrota-impostor-aluno`, `27-impostor-venceu-tv`, `28-impostor-venceu-aluno` |

## Critérios
- TV em 1366×768 e 1920×1080 sem rolagem (fonte da TV escala com `vw`; lobby, escrita e votação crescem com poucos alunos).
- Chromebook: animações só com `transform`/`opacity`; `prefers-reduced-motion` desliga os movimentos e o fundo animado.
- Som: TV começa com som, aluno começa mudo. Sons só no item grande, em cada fala, na votação, na eliminação e no fim.
