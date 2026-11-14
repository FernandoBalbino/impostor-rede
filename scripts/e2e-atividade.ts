// Trilha /atividade no Chrome: colar bloqueado, mínimo de 50 letras, missões de arrastar e o botão para entrar na sala.
// Uso: node scripts/e2e-atividade.ts   (Vite local; ou E2E_URL=https://.../impostor-rede/)
import { chromium, type Locator } from 'playwright';
import { mkdirSync } from 'node:fs';
import { MISSIONS } from '../shared/activity.ts';

const URL = process.env.E2E_URL ?? 'http://localhost:5173/impostor-rede/';
const OUT = 'qa-evidence';
mkdirSync(OUT, { recursive: true });

// Respostas das missões de escrever, na ordem em que aparecem.
const ANSWERS = [
  'O modem recebe a internet da operadora que vem pela rua e o roteador espalha o sinal para o celular pelo Wi-Fi.',
  'O IP é como o endereço da minha casa para o carteiro achar, e o ping mostra se o jogo vai ficar com atraso.',
  'O firewall bloqueia o que é perigoso e a senha deixa só quem conhece entrar, a nuvem guarda meus arquivos na internet.',
  'O processador pensa e faz as contas, a RAM guarda o que está aberto e o SSD guarda os arquivos mesmo desligado.',
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const errors: string[] = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (name: string, fullPage = false) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  };
  // Arrasta com o mouse de verdade (botão apertado, vários passos), como no touchpad.
  const dragTo = async (from: Locator, to: Locator) => {
    const a = (await from.boundingBox())!;
    const b = (await to.boundingBox())!;
    if (b.y + b.height > 768) throw new Error('a função ficou fora da tela: o aluno teria que rolar arrastando');
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 8, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
  };

  await page.goto(`${URL}atividade`);
  await page.locator('.m-card').waitFor();
  await shot('31-atividade-missao', true);

  // Colar (Ctrl+V e evento de colar com texto) não entra no campo.
  const box = page.locator('#resposta');
  await page.evaluate(() => navigator.clipboard.writeText('texto copiado da internet com muitas letras para passar do mínimo exigido'));
  await box.click();
  await page.keyboard.press('Control+V');
  await box.evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'resposta pronta copiada de outro lugar');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  if ((await box.inputValue()) !== '') throw new Error('colar funcionou');
  await page.locator('.err', { hasText: 'Colar está desativado' }).waitFor(); // o título também cita a regra

  // Copiar o texto do cartão também é barrado.
  await box.pressSequentially('Eu acho que é a rede gigante que liga computadores do mundo inteiro e também o modem.', { delay: 2 });
  await page.locator('.err', { hasText: 'copiou o texto do cartão' }).waitFor();
  if (await page.getByRole('button', { name: /Enviar resposta/ }).isEnabled()) throw new Error('aceitou texto copiado do cartão');
  await shot('32-atividade-bloqueios');

  // Abaixo de 50 letras o botão fica travado.
  await box.fill('');
  await box.pressSequentially('O roteador cria o Wi-Fi.', { delay: 2 });
  if (await page.getByRole('button', { name: /Enviar resposta/ }).isEnabled()) throw new Error('aceitou menos de 50 letras');

  let written = 0;
  for (const [k, m] of MISSIONS.entries()) {
    const last = k === MISSIONS.length - 1;
    if (m.kind === 'write') {
      await box.fill('');
      await box.pressSequentially(ANSWERS[written++], { delay: 1 });
      await page.getByRole('button', { name: last ? /concluir a trilha/ : /Enviar resposta/ }).click();
    } else {
      await page.locator('.match').waitFor();
      await page.waitForTimeout(700); // rolagem suave até o cartão
      if (k === 1) {
        await shot('33-atividade-arrastar');
        // Erro: solta na função de outro item → volta e conta como tentativa errada.
        const [a, b] = m.items;
        await dragTo(page.locator(`[data-chip="${a}"]`), page.locator(`[data-slot="${b}"]`));
        await page.locator(`[data-slot="${b}"].wrong`).waitFor();
        await page.screenshot({ path: `${OUT}/34-atividade-arrastar-erro.png` });
        // Clique na imagem e depois na função também funciona.
        await page.locator(`[data-chip="${a}"]`).click();
        await page.locator(`[data-slot="${a}"]`).click();
        await page.locator(`[data-slot="${a}"].ok`).waitFor();
      }
      for (const id of m.items) {
        if (await page.locator(`[data-slot="${id}"].ok`).count()) continue;
        await dragTo(page.locator(`[data-chip="${id}"]`), page.locator(`[data-slot="${id}"]`));
        await page.locator(`[data-slot="${id}"].ok`).waitFor();
      }
      if (k === 1) await shot('35-atividade-arrastar-completo');
      await page.getByRole('button', { name: last ? /Concluir a trilha/ : /Concluir missão/ }).click();
    }
    if (last) break;
    await page.locator('.m-clear').waitFor();
    if (k === 0) await shot('36-atividade-missao-cumprida');
    await page.getByRole('button', { name: /Ir para a missão/ }).click();
    await page.locator('.m-card:not(.m-clear)').waitFor();
  }
  await page.locator('.trail-final').waitFor();
  await page.waitForTimeout(1300);
  await shot('37-atividade-final');
  await page.getByRole('link', { name: /Entrar na sala do jogo/ }).click();
  await page.getByLabel(/Seu nome/).waitFor();
  await shot('38-atividade-entrar-sala');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('ATIVIDADE OK');
} finally {
  await browser.close();
}
