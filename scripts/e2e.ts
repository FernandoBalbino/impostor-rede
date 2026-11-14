// Partida de ponta a ponta no navegador, com prints de cada tela em qa-evidence/.
// Uso: node scripts/e2e.ts                      (local: servidor na 3000 + Vite na 5173)
//      E2E_URL=https://... LEVE=1 node scripts/e2e.ts   (produção: 3 alunos, 1 rodada, sem prints extras)
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.E2E_URL ?? 'http://localhost:5173/impostor-rede/';
const LIGHT = !!process.env.LEVE;
const NAMES = LIGHT ? ['Ana', 'Bruno', 'Caio'] : ['Ana', 'Bruno', 'Caio', 'Duda', 'Enzo'];
const OUT = 'qa-evidence';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const errors: string[] = [];
const pages: Page[] = [];
const open = async (w = 1366, h = 768) => {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on('dialog', (d) => d.accept());
  pages.push(page);
  await page.addInitScript(() => {
    const w = window as unknown as { played: string[] };
    w.played = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      w.played.push((this.currentSrc || this.src).split('/').pop()!);
      return orig.call(this).catch(() => {});
    };
  });
  return page;
};
const shot = async (p: Page, name: string) => {
  if (LIGHT) return;
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/${name}.png` });
};
const step = (msg: string) => console.log('•', msg);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

try {
  const tv = await open();
  await tv.goto(URL);
  await tv.getByText('servidor online').waitFor({ timeout: 90_000 }); // Render pode estar dormindo
  await wait(1200);
  await shot(tv, '00-inicio');
  await tv.getByRole('button', { name: /Sou professor/ }).click();
  await wait(500);
  await shot(tv, '01-criar-sala');
  await tv.getByRole('button', { name: 'Criar sala' }).click();
  const code = (await tv.locator('.code').getAttribute('aria-label'))!.replace('Código ', '');
  step(`sala ${code}`);

  const kids: Page[] = [];
  for (const [k, name] of NAMES.entries()) {
    const p = await open();
    await p.goto(`${URL}?sala=${code}`);
    if (k === 0) {
      await wait(600);
      await shot(p, '02-entrar-aluno');
    }
    await p.getByLabel(/Seu nome/).fill(name);
    await p.getByRole('button', { name: 'Entrar' }).click();
    await p.getByText(/Você entrou/).waitFor();
    kids.push(p);
  }
  await tv.getByText(`${NAMES.length} alunos conectados`).waitFor();
  await wait(900);
  await shot(tv, '03-lobby-tv');
  await shot(kids[0], '04-lobby-aluno');

  // Partida 1: ajuda "dica escrita".
  await tv.getByRole('combobox').selectOption('dica');
  await wait(400);
  await tv.getByRole('button', { name: /Começar partida/ }).click();

  const roles = async () => {
    const imp: Page[] = [];
    const crew: Page[] = [];
    for (const p of kids) {
      await p.locator('.item-card, .spectator').first().waitFor();
      if (await p.locator('.spectator').count()) continue;
      ((await p.locator('.impostor-card').count()) ? imp : crew).push(p);
    }
    return { imp, crew };
  };
  const nameOf = async (p: Page) => (await p.locator('.me-pill').innerText()).trim();
  const write = async (p: Page, text: string) => {
    await p.locator('#frase').fill(text);
    await p.getByRole('button', { name: 'Enviar frase' }).click();
    await p.locator('.sent, .look-tv').first().waitFor(); // o último a enviar já vai direto para "olhe a TV"
  };
  const voteOut = async (alive: Page[], target: string, firstShot?: string) => {
    for (const [k, p] of alive.entries()) {
      if ((await nameOf(p)) === target) await p.getByRole('button', { name: /Pular voto/ }).click();
      else {
        await p.locator('.vote-opt', { hasText: target }).click();
        await p.getByRole('button', { name: `Votar em ${target}` }).click();
      }
      await p.locator('.voted-screen, .result').first().waitFor();
      if (k === 0 && firstShot) await shot(p, firstShot);
    }
  };

  let { imp, crew } = await roles();
  if (imp.length !== 1) throw new Error(`esperava 1 impostor, achei ${imp.length}`);
  step(`impostor: ${await nameOf(imp[0])}`);
  await tv.locator('.crowd').waitFor();
  await wait(1200);
  await shot(tv, '05-escrevendo-tv');
  await shot(crew[0], '06-aluno-item');
  await shot(imp[0], '07-impostor-dica');

  // Frase com o nome do item é barrada no navegador.
  const itemName = await crew[0].locator('.item-card h1').innerText();
  await crew[0].locator('#frase').fill(`isso é ${itemName.toLowerCase()} mesmo`);
  if (!(await crew[0].getByRole('button', { name: 'Enviar frase' }).isDisabled())) throw new Error('aceitou frase com o nome do item');
  await wait(300);
  await shot(crew[0], '08-aluno-nome-bloqueado');

  const phrases = ['Liga os aparelhos da rede', 'Todo técnico usa no trabalho', 'Ajuda a internet a funcionar melhor', 'Tem na escola e em empresa', 'Serve para conectar coisas'];
  await write(crew[0], phrases[0]);
  await wait(500);
  await shot(crew[0], '09-frase-enviada-aluno');
  await shot(tv, '10-escrevendo-tv-progresso');
  for (const [k, p] of [...crew.slice(1), ...imp].entries()) await write(p, phrases[k + 1]);
  step('frases enviadas');

  await tv.locator('.item-reveal').waitFor();
  await wait(2800);
  await shot(tv, '11-item-grande-tv');
  await shot(kids[0], '12-olhe-tv-aluno');
  await tv.locator('.phrase-slide').waitFor({ timeout: 10_000 });
  await wait(2600);
  await shot(tv, '13-fala-tv');
  await tv.getByRole('button', { name: /Pausar/ }).click();
  await tv.locator('.paused-tag').waitFor();
  await tv.getByRole('button', { name: /Continuar/ }).click();
  await tv.getByRole('button', { name: /Abrir votação/ }).click();

  await tv.locator('.vote-tv').waitFor();
  await kids[0].locator('.vote-list').waitFor();
  await wait(1200);
  await shot(tv, '14-votacao-tv');
  // Rodada 1: a turma tira um aluno que não é o impostor.
  const victim = await nameOf(crew[crew.length - 1]);
  await crew[0].locator('.vote-opt', { hasText: victim }).click();
  await wait(300);
  await shot(crew[0], '15-votacao-aluno');
  if (LIGHT) {
    for (const p of kids) {
      await p.getByRole('button', { name: /Pular voto/ }).click();
      await p.locator('.voted-screen, .result').first().waitFor();
    }
  } else await voteOut([crew[0], ...kids.filter((p) => p !== crew[0])], victim, '16-voto-enviado-aluno');
  await tv.locator('.bars').waitFor();
  await wait(1800);
  await shot(tv, '17-resultado-votos-tv');
  if (LIGHT) {
    await tv.getByText('Ninguém foi desconectado').waitFor({ timeout: 10_000 });
    step('teste leve: rodada completa ok');
  } else {
    await tv.locator('.verdict').waitFor({ timeout: 10_000 });
    await wait(1600);
    await shot(tv, '18-eliminado-tv');
    await shot(crew[crew.length - 1], '19-eliminado-aluno');
    step(`${victim} saiu`);

    // Rodada 2: o eliminado só assiste; a turma pega o impostor.
    await tv.getByRole('button', { name: /Próxima rodada/ }).click();
    ({ imp, crew } = await roles());
    await kids.find((p) => !imp.includes(p) && !crew.includes(p))!.locator('.spectator').waitFor();
    await shot(kids.find((p) => !imp.includes(p) && !crew.includes(p))!, '20-espectador-aluno');
    for (const [k, p] of [...crew, ...imp].entries()) await write(p, phrases[k]);
    await tv.locator('.item-reveal').waitFor();
    await tv.getByRole('button', { name: /Abrir votação/ }).click();
    await kids[0].locator('.vote-list, .voted-screen, .spectator').first().waitFor();
    const impName = await nameOf(imp[0]);
    await voteOut([...crew, ...imp], impName);
    await tv.locator('.verdict.is').waitFor({ timeout: 12_000 });
    await wait(1200);
    await shot(tv, '21-impostor-pego-tv');
    await shot(crew[0], '22-impostor-pego-aluno');
    await tv.locator('.final').waitFor({ timeout: 15_000 });
    await wait(4200);
    await shot(tv, '23-vitoria-podio-tv');
    await shot(crew[0], '24-vitoria-aluno');
    await shot(imp[0], '25-derrota-impostor-aluno');
    step('alunos venceram');

    // Partida 2: 2 impostores? Não: 1 impostor com imagem pixelada, e a turma erra até o impostor vencer.
    await tv.getByRole('button', { name: /Nova partida/ }).click();
    await tv.locator('.lobby').waitFor();
    await tv.getByRole('combobox').selectOption('pixel');
    await wait(400);
    await tv.getByRole('button', { name: /Começar partida/ }).click();
    ({ imp, crew } = await roles());
    await wait(900);
    await shot(imp[0], '26-impostor-pixelado');
    for (let r = 0; r < 3; r++) {
      if (r) {
        await tv.getByRole('button', { name: /Próxima rodada/ }).click();
        ({ imp, crew } = await roles());
      }
      for (const [k, p] of [...crew, ...imp].entries()) await write(p, phrases[k]);
      await tv.locator('.item-reveal').waitFor();
      await tv.getByRole('button', { name: /Abrir votação/ }).click();
      await crew[0].locator('.vote-list').waitFor();
      await voteOut([...crew, ...imp], await nameOf(crew[crew.length - 1]));
      await tv.locator('.verdict').waitFor({ timeout: 12_000 });
      if (crew.length - 1 <= 1) break;
    }
    await tv.locator('.final').waitFor({ timeout: 15_000 });
    await wait(4200);
    await shot(tv, '27-impostor-venceu-tv');
    await shot(imp[0], '28-impostor-venceu-aluno');
    step('impostor venceu');

    // Partida 3: só para o print do modo "dois itens".
    await tv.getByRole('button', { name: /Nova partida/ }).click();
    await tv.locator('.lobby').waitFor();
    await tv.getByRole('combobox').selectOption('dupla');
    await tv.locator('.seg button', { hasText: '2' }).first().click();
    await wait(300);
    await shot(tv, '29-lobby-2-impostores-tv');
    await tv.getByRole('button', { name: /Começar partida/ }).click();
    ({ imp, crew } = await roles());
    if (imp.length !== 2) throw new Error(`esperava 2 impostores, achei ${imp.length}`);
    await wait(900);
    await shot(imp[0], '30-impostor-dois-itens');
  }

  const played = await tv.evaluate(() => (window as unknown as { played: string[] }).played);
  step(`sons na TV: ${[...new Set(played)].join(', ')}`);
  if (errors.length) throw new Error(`erros no console:\n${errors.join('\n')}`);
  console.log('E2E OK');
} catch (err) {
  for (const [k, p] of pages.entries()) await p.screenshot({ path: `${OUT}/falha-${k}.png` }).catch(() => {});
  throw err;
} finally {
  await browser.close();
}
