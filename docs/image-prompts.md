# Prompts das imagens

Modelo: **gpt-image-2.5-sunburst**. Itens no ElevenLabs (1280×720); avatares no Figma AI (1024×1024). Mesmo modelo e mesmo prompt-base do LeilãoTEC, para o estilo combinar.

## Itens (folhas 1 a 3)

Prompt-base:

> A 3x3 grid sprite sheet of nine separate computer networking objects for an educational game. All nine share exactly the same art style: polished semi-realistic 3D product render, soft studio lighting from the upper left, gentle specular highlights, clean crisp edges, saturated but natural colors, same camera angle (three-quarter view from slightly above), each object scaled to fill about 70% of its cell and perfectly centered in its cell, with wide empty white margins so no object touches another object. Pure flat white background (#FFFFFF) everywhere, no floor, no drop shadows, no reflections, no grid lines, no borders, no text, no numbers, no letters, no logos, no brand names. No object is white; use dark or colored plastics.

Depois vêm as 3 linhas, da esquerda para a direita, na ordem de `ITEMS` em `shared/catalog.ts`:
1. switch, placa de rede, adaptador Wi-Fi USB / modem de fibra, ponto de acesso de teto, repetidor de tomada / cabo de rede azul, conector RJ45, alicate de crimpar
2. testador de cabo, fibra óptica amarela, patch panel / rack de parede, servidor de rack, câmera IP / tomada de rede preta, hub bege antigo, celular com símbolo de Wi-Fi
3. (ícones 3D) pino de mapa com nó de rede (IP), símbolo de Wi-Fi, globo com conexões / nuvem com seta, cadeado com chave, muro de tijolos com fogo (firewall) / velocímetro, raquete de pingue-pongue (ping), seta verde entrando numa bandeja (download)

## Avatares (folhas av1 a av4)

Prompt-base: "A 3x3 grid sprite sheet of nine separate cute little robot mascot characters for a classroom game, shown as head and upper body busts facing the viewer…", com as cores vermelho, laranja, amarelo / verde-limão, verde-água, azul-céu / azul royal, roxo, rosa. Cada folha muda o modelo do robô:
1. cabeça redonda com uma antena
2. cabeça quadrada com duas antenas
3. cabeça oval com fones de ouvido
4. cápsula com cúpula de vidro e um olho só

Evite objetos brancos: o recorte remove o branco ligado à borda.

## Recorte

```bash
python scripts/cut-sprites.py <pasta com sheet1..3.png e av1..4.png>
```

Gera `web/public/items/<id>.webp` (512 px) + `thumb/` (160 px), `web/public/avatars/aNN.webp` (256 px) e `server/pixels.json` (cada item em 10×10 para o impostor). Para trocar um item, gere uma folha nova com o prompt-base e rode o script.
