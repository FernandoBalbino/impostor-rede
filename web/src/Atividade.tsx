// /atividade: trilha de preparação para o jogo. Estuda os cartões e responde com as próprias palavras.
// As respostas ficam só neste navegador (sessionStorage, para o próximo aluno do Chromebook começar do zero).
import confetti from 'canvas-confetti';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type SyntheticEvent, type TextareaHTMLAttributes } from 'react';
import { CATEGORY_LABEL, ITEM_BY_ID, ITEMS } from '../../shared/catalog.ts';
import { MIN_LETTERS, MISSIONS, checkAnswer, countLetters, type Mission } from '../../shared/activity.ts';
import { ItemImg, Logo, NetBackdrop } from './ui.tsx';

const KEY = 'impostor-rede:atividade';
const JOIN_URL = `${import.meta.env.BASE_URL}?sala=`; // abre direto "Entrar na sala" (código + nome)

interface Progress { answers: string[]; step: number } // step = missão atual; MISSIONS.length = trilha completa

function load(): Progress {
  try {
    const p = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(p?.answers) && p.answers.length === MISSIONS.length && Number.isInteger(p.step)) return p;
  } catch { /* sem storage ou dado estranho: começa do zero */ }
  return { answers: MISSIONS.map(() => ''), step: 0 };
}

// Campo que só aceita digitação: colar e arrastar texto ficam bloqueados.
function TypedTextarea({ onBlocked, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { onBlocked: () => void }) {
  const block = (e: SyntheticEvent) => (e.preventDefault(), onBlocked());
  return (
    <textarea
      {...props}
      autoComplete="off"
      onPaste={block}
      onDrop={block}
      onBeforeInput={(e) => {
        const type = (e.nativeEvent as InputEvent).inputType ?? '';
        if (type.startsWith('insertFromPaste') || type === 'insertFromDrop') block(e);
      }}
    />
  );
}

export function Atividade() {
  const [{ answers, step }, setProgress] = useState(load);
  const [cleared, setCleared] = useState(false); // acabou de enviar: mostra "missão cumprida" antes da próxima
  const [warn, setWarn] = useState('');
  const done = step >= MISSIONS.length;

  useEffect(() => void (document.title = 'Atividade · Impostor da Rede'), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ answers, step }));
    } catch { /* sem storage: o progresso só fica na tela */ }
  }, [answers, step]);
  useEffect(() => {
    setWarn('');
    // Missão de arrastar: imagens e funções inteiras na tela (arrastar e rolar ao mesmo tempo é ruim no touchpad).
    if (!cleared && MISSIONS[step]?.kind === 'match') document.querySelector('.m-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else scrollTo({ top: 0, behavior: 'smooth' }); // no Chrome novo o scrollTo devolve uma Promise: não pode ser o retorno do efeito
  }, [step, cleared]);

  const noCopy = (e: SyntheticEvent) => (e.preventDefault(), setWarn('Copiar está desativado nesta atividade. Leia e responda com as suas palavras 🙂'));
  const mission = MISSIONS[Math.min(step, MISSIONS.length - 1)];
  const text = answers[step] ?? '';
  const letters = countLetters(text);
  const problem = checkAnswer(text, mission);
  const ready = letters >= MIN_LETTERS && !problem;
  const complete = (answer: string) => {
    setProgress({ answers: answers.map((a, j) => (j === step ? answer : a)), step: step + 1 });
    setCleared(true);
  };
  const last = step === MISSIONS.length - 1;

  return (
    <div className="trail" onCopy={noCopy} onCut={noCopy} onContextMenu={(e) => e.preventDefault()}>
      <NetBackdrop />
      <header className="trail-top">
        <Logo />
        <span className="pill">{Math.min(step, MISSIONS.length)} de {MISSIONS.length} missões</span>
      </header>
      <main className="trail-main">
        <div className="trail-head">
          <p className="eyebrow">Antes do jogo</p>
          <h1>Trilha do técnico de redes</h1>
          <p>
            No Impostor da Rede você precisa saber para que serve cada aparelho. Nas missões ✍️, leia os cartões e responda com as suas palavras
            (pelo menos {MIN_LETTERS} letras; colar está desativado). Nas missões 🧩, arraste cada imagem até a função certa.
          </p>
        </div>

        <div className="path" style={{ '--p': Math.min(step, MISSIONS.length - 1) / (MISSIONS.length - 1), '--n': MISSIONS.length } as CSSProperties}>
          <div className="path-fill" aria-hidden="true" />
          <ol className="nodes">
            {MISSIONS.map((m, k) => {
              const state = k < step ? 'done' : k === step ? 'now' : 'locked';
              return (
                <li key={k} className={`node ${state}`} aria-current={state === 'now' ? 'step' : undefined}>
                  <span className="node-dot" aria-hidden="true">{state === 'done' ? '✓' : state === 'locked' ? '🔒' : m.emoji}</span>
                  <small>Missão {k + 1} {m.kind === 'match' ? '🧩' : '✍️'}</small>
                  <b>{m.title}</b>
                  <span className="sr-only">{state === 'done' ? 'cumprida' : state === 'now' ? 'atual' : 'bloqueada'}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {cleared && !done ? (
          <section className="m-card m-clear" aria-live="polite">
            <span className="m-check" aria-hidden="true">✓</span>
            <h2>Missão {step} cumprida!</h2>
            <p className="m-tip">💡 {MISSIONS[step - 1].tip}</p>
            <button className="btn btn-primary btn-xl" autoFocus onClick={() => setCleared(false)}>
              Ir para a missão {step + 1} →
            </button>
          </section>
        ) : !done ? (
          <section className="m-card" key={step} aria-labelledby="m-title">
            <div className="m-head">
              <span className="m-emoji" aria-hidden="true">{mission.emoji}</span>
              <div>
                <small className="m-step">Missão {step + 1} de {MISSIONS.length}</small>
                <h2 id="m-title">{mission.title}</h2>
              </div>
            </div>
            {mission.kind === 'match' ? (
              <Match key={step} mission={mission} last={last} onDone={(errors) => complete(`combinou tudo com ${errors} erro(s)`)} />
            ) : (<>
            <p className="study-label">📖 Estude os cartões</p>
            <ul className="study">
              {mission.items.map((id, k) => {
                const item = ITEM_BY_ID[id];
                return (
                  <li key={id} style={{ '--k': k } as CSSProperties}>
                    <ItemImg id={id} thumb size={96} />
                    <div>
                      <small>{CATEGORY_LABEL[item.category]}</small>
                      <b>{item.name}</b>
                      <p>{item.summary}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <label className="m-q" htmlFor="resposta">✍️ {mission.question}</label>
            <TypedTextarea
              id="resposta"
              value={text}
              maxLength={800}
              rows={5}
              spellCheck
              onChange={(e) => (setWarn(''), setProgress({ step, answers: answers.map((a, j) => (j === step ? e.target.value : a)) }))}
              onBlocked={() => setWarn('Colar está desativado. Escreva com as suas palavras 🙂')}
            />
            {(warn || problem) && <p className="err" role="alert">{warn || problem}</p>}
            <div className="m-foot">
              <span className="m-meter" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, letters / MIN_LETTERS)})` }} /></span>
              <small className={`m-count ${ready ? 'ok' : ''}`}>
                {ready ? '✓ Pronto para enviar' : letters >= MIN_LETTERS ? `${letters} letras ✓` : `${letters}/${MIN_LETTERS} letras no mínimo`}
              </small>
              <button className="btn btn-primary btn-xl" disabled={!ready} onClick={() => ready && complete(text)}>
                {last ? 'Enviar e concluir a trilha 🏁' : 'Enviar resposta →'}
              </button>
            </div>
            </>)}
          </section>
        ) : null}
      </main>
      {done && <Finish />}
    </div>
  );
}

const shuffle = <T,>(list: T[]) => [...list].sort(() => Math.random() - 0.5);

// Missão de combinar: arrastar (mouse, touchpad ou toque) ou clicar na imagem e depois na função.
function Match({ mission, last, onDone }: { mission: Mission; last: boolean; onDone: (errors: number) => void }) {
  const [chips] = useState(() => shuffle(mission.items));
  const [slots] = useState(() => shuffle(mission.items));
  const [placed, setPlaced] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [errors, setErrors] = useState(0);
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const allDone = placed.length === mission.items.length;

  const tryDrop = (itemId: string, slotId: string) => {
    setPicked(null);
    if (placed.includes(slotId)) return;
    if (itemId === slotId) return setPlaced((p) => [...p, itemId]);
    setErrors((n) => n + 1);
    setWrong(slotId);
    setTimeout(() => setWrong((w) => (w === slotId ? null : w)), 650);
  };
  const slotAt = (x: number, y: number) =>
    document.elementsFromPoint(x, y).map((el) => el.closest<HTMLElement>('[data-slot]')).find(Boolean)?.dataset.slot ?? null;

  const down = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    e.currentTarget.classList.add('dragging');
    e.currentTarget.style.transform = `translate(${dx}px, ${dy}px) rotate(-3deg) scale(1.06)`;
    const s = slotAt(e.clientX, e.clientY);
    setOver((o) => (o === s ? o : s));
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    e.currentTarget.classList.remove('dragging');
    e.currentTarget.style.transform = '';
    setOver(null);
    if (!d) return;
    if (!d.moved) return setPicked((p) => (p === d.id ? null : d.id)); // clique: escolhe a imagem
    const s = slotAt(e.clientX, e.clientY);
    if (s) tryDrop(d.id, s);
  };

  return (
    <>
      <p className="m-q">🧩 {mission.question} <span className="muted">Também dá para clicar na imagem e depois na função.</span></p>
      <div className="match">
        <ul className="chips" aria-label="Imagens">
          {chips.map((id) =>
            placed.includes(id) ? (
              <li key={id} className="chip-gone" aria-hidden="true" />
            ) : (
              <li key={id}>
                <button
                  type="button" className={`chip ${picked === id ? 'picked' : ''}`} data-chip={id} aria-pressed={picked === id}
                  onPointerDown={(e) => down(e, id)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setPicked(id))}
                >
                  <ItemImg id={id} thumb size={64} />
                  <b>{ITEM_BY_ID[id].name}</b>
                </button>
              </li>
            ),
          )}
          {allDone && <li className="chips-done">🎉 Todos no lugar!</li>}
        </ul>
        <ul className="slots" aria-label="Funções">
          {slots.map((id) => {
            const ok = placed.includes(id);
            return (
              <li key={id}>
                <button
                  type="button" data-slot={id} disabled={ok}
                  className={`slot ${ok ? 'ok' : ''} ${over === id ? 'over' : ''} ${wrong === id ? 'wrong' : ''} ${picked && !ok ? 'ready' : ''}`}
                  onClick={() => picked && tryDrop(picked, id)}
                >
                  <span className="slot-pic">{ok ? <ItemImg id={id} thumb size={56} /> : '?'}</span>
                  <span className="slot-text">
                    {ok && <b>{ITEM_BY_ID[id].name}</b>}
                    {ITEM_BY_ID[id].summary}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="m-foot">
        <span className="m-meter" aria-hidden="true"><i style={{ transform: `scaleX(${placed.length / mission.items.length})` }} /></span>
        <small className={`m-count ${allDone ? 'ok' : ''}`} aria-live="polite">
          {allDone ? '✓ Tudo certo!' : `${placed.length}/${mission.items.length} no lugar certo`}
          {errors > 0 && ` · ${errors} ${errors === 1 ? 'tentativa errada' : 'tentativas erradas'}`}
        </small>
        <button className="btn btn-primary btn-xl" disabled={!allDone} onClick={() => onDone(errors)}>
          {last ? 'Concluir a trilha 🏁' : 'Concluir missão →'}
        </button>
      </div>
    </>
  );
}

function Finish() {
  useEffect(() => {
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, disableForReducedMotion: true });
    const id = setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, disableForReducedMotion: true });
      confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, disableForReducedMotion: true });
    }, 500);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="trail-final" role="dialog" aria-modal="true" aria-labelledby="tf-title">
      <div className="tf-card">
        <span className="tf-trophy" aria-hidden="true">🏆</span>
        <p className="eyebrow">Trilha completa</p>
        <h1 id="tf-title">Você revisou os <span className="grad">{ITEMS.length} itens</span> do jogo!</h1>
        <p>Agora é hora do Impostor da Rede. Fique de olho na TV: o código da sala vai aparecer lá.</p>
        <ul className="tf-badges" aria-label="Missões cumpridas">
          {MISSIONS.map((m, k) => (
            <li key={k} style={{ '--k': k } as CSSProperties} title={m.title}>{m.emoji}</li>
          ))}
        </ul>
        <a className="btn btn-primary tf-go" href={JOIN_URL} ref={(a) => a?.focus()}>Entrar na sala do jogo 🕵️</a>
        <small className="muted">Você vai digitar o código da sala e o seu nome.</small>
      </div>
    </div>
  );
}
