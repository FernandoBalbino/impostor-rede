// Cenas que aparecem na TV e no Chromebook: resultado da votação (com a eliminação) e o fim de jogo com pódio.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import { MAX_ROUNDS, rankPlayers, type PublicRoom } from '../../shared/protocol.ts';
import { play } from './sound.ts';
import { Avatar, avatarColor, reducedMotion, useOnce } from './ui.tsx';

export function gameOver(room: PublicRoom) {
  const r = room.result;
  if (!r) return false;
  const crewAlive = room.players.filter((p) => p.alive).length - r.impostorsLeft;
  return r.impostorsLeft === 0 || r.impostorsLeft >= crewAlive || room.round >= MAX_ROUNDS;
}

export function ResultScene({ room, tv, meId }: { room: PublicRoom; tv?: boolean; meId?: string }) {
  const r = room.result!;
  const [step, setStep] = useState(reducedMotion() ? 2 : 0);
  useEffect(() => {
    if (step >= 2) return;
    const t = setTimeout(() => setStep(step + 1), step === 0 ? 3200 : 1700);
    return () => clearTimeout(t);
  }, [step]);
  const out = room.players.find((p) => p.id === r.eliminatedId);
  useOnce(step >= 1 ? `r${room.round}` : null, () => play(out ? 'eliminado' : 'fala'));

  const rows = Object.entries(r.tally)
    .map(([id, votes]) => ({ p: room.players.find((x) => x.id === id), votes }))
    .filter((x) => x.p)
    .sort((a, b) => b.votes - a.votes);
  const max = Math.max(1, r.skip, ...rows.map((x) => x.votes));

  if (step === 0)
    return (
      <div className={`result ${tv ? 'tv-size' : ''}`}>
        <h1 className="big-title">Resultado da votação</h1>
        <ul className="bars">
          {rows.map(({ p, votes }, k) => (
            <li key={p!.id} style={{ '--c': avatarColor(p!.avatar), '--w': votes / max, '--k': k } as CSSProperties}>
              <span className="bar-who"><Avatar n={p!.avatar} size={tv ? 56 : 40} /> {p!.name}</span>
              <span className="bar"><i /></span>
              <b>{votes}</b>
            </li>
          ))}
          <li className="skip-row" style={{ '--w': r.skip / max, '--k': rows.length } as CSSProperties}>
            <span className="bar-who"><span className="skip-ico">⏭</span> Pularam</span>
            <span className="bar"><i /></span>
            <b>{r.skip}</b>
          </li>
        </ul>
      </div>
    );

  const late = gameOver(room) ? <p className="muted next-hint">Fim de jogo! Já vem o resultado…</p> : null;
  if (!out)
    return (
      <div className={`result verdict-scene ${tv ? 'tv-size' : ''}`}>
        <div className="nobody" aria-hidden="true">🤝</div>
        <h1 className="big-title">Ninguém foi desconectado</h1>
        <p className="lead">Deu empate ou a maioria pulou o voto. O impostor continua na rede…</p>
        {late}
      </div>
    );
  const me = out.id === meId;
  const left = r.impostorsLeft;
  return (
    <div className={`result verdict-scene ${tv ? 'tv-size' : ''} ${r.wasImpostor ? 'caught' : ''}`}>
      {r.wasImpostor && step >= 2 && <div className="flash" aria-hidden="true" />}
      <div className="eject" style={{ '--c': avatarColor(out.avatar) } as CSSProperties}>
        <div className="eject-avatar"><Avatar n={out.avatar} size={tv ? 260 : 150} /></div>
        <div className="plug" aria-hidden="true"><span className="plug-a">🔌</span><span className="spark">⚡</span></div>
      </div>
      <h1 className="big-title">{me ? 'Você foi desconectado da rede!' : `${out.name} foi desconectado da rede!`}</h1>
      {step >= 2 && (
        <p className={`verdict ${r.wasImpostor ? 'is' : 'isnt'}`}>
          {r.wasImpostor ? `${me ? 'VOCÊ' : out.name.toUpperCase()} ERA O IMPOSTOR!` : `${me ? 'Você' : out.name} não era o impostor.`}
        </p>
      )}
      {step >= 2 && left > 0 && (
        <p className="lead">{left === 1 ? 'Ainda resta 1 impostor na rede.' : `Ainda restam ${left} impostores na rede.`}</p>
      )}
      {step >= 2 && late}
    </div>
  );
}

const REASON: Record<string, string> = {
  caught: 'Todos os impostores foram pegos!',
  outnumbered: 'Sobrou só o impostor e mais 1 aluno.',
  rounds: 'O impostor sobreviveu às 20 rodadas.',
  teacher: 'Partida encerrada pelo professor.',
};

export function FinalScene({ room, tv, meId, children }: { room: PublicRoom; tv?: boolean; meId?: string; children?: ReactNode }) {
  const crewWon = room.winner === 'crew';
  const ranked = rankPlayers(room.players);
  const impostors = room.players.filter((p) => p.wasImpostor);
  const me = ranked.find((x) => x.player.id === meId);
  const iWasImpostor = !!me?.player.wasImpostor;
  const iWon = room.winner && me ? (room.winner === 'impostors') === iWasImpostor : null;

  useEffect(() => {
    if (room.winner) play(crewWon ? 'vitoria' : 'derrota');
    if (reducedMotion() || !room.winner) return;
    const colors = crewWon ? ['#22d3ee', '#2ee6a6', '#ffd21f', '#3d6bff'] : ['#ff3b5c', '#ff8a1f', '#1a1a2e', '#a64dff'];
    const end = Date.now() + 2200;
    let raf = 0;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, disableForReducedMotion: true });
      confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, disableForReducedMotion: true });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    const t = setTimeout(() => (raf = requestAnimationFrame(frame)), 400);
    return () => (clearTimeout(t), cancelAnimationFrame(raf));
  }, [room.winner, crewWon]);

  const title = room.winner === null ? 'Fim de jogo' : crewWon ? 'OS ALUNOS VENCERAM!' : room.settings.impostors > 1 ? 'OS IMPOSTORES VENCERAM!' : 'O IMPOSTOR VENCEU!';
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);

  return (
    <div className={`final ${tv ? 'tv-size' : ''} ${room.winner === 'impostors' ? 'bad' : 'good'}`}>
      <header className="final-banner">
        <span className="final-emoji" aria-hidden="true">{room.winner === null ? '🏁' : crewWon ? '🎉' : '🕵️'}</span>
        <h1>{title}</h1>
        <p className="lead">{REASON[room.endReason ?? 'teacher']}</p>
        {me && iWon !== null && <p className={`you-won ${iWon ? 'yes' : 'no'}`}>{iWon ? 'Seu time ganhou! 🏆' : 'Seu time perdeu desta vez.'}</p>}
      </header>
      <div className="final-body">
        <section className="impostor-reveal">
          <p className="eyebrow">{impostors.length > 1 ? 'Os impostores eram' : 'O impostor era'}</p>
          <div className="imp-list">
            {impostors.map((p) => (
              <span key={p.id} className="imp" style={{ '--c': avatarColor(p.avatar) } as CSSProperties}>
                <Avatar n={p.avatar} size={tv ? 96 : 64} />
                <b>{p.name}{p.id === meId && ' (você)'}</b>
              </span>
            ))}
          </div>
        </section>
        <section className="podium" aria-label="Pódio">
          {podium.map((r) => (
            <div key={r.player.id} className={`step pos${r.position} ${r.player.id === meId ? 'me' : ''}`} style={{ '--c': avatarColor(r.player.avatar) } as CSSProperties}>
              <Avatar n={r.player.avatar} size={tv ? (r.position === 1 ? 120 : 96) : r.position === 1 ? 72 : 56} />
              <b className="step-name">{r.player.name}</b>
              <span className="step-pts">{r.player.points} pts</span>
              <div className="step-block"><span>{r.position}º</span></div>
            </div>
          ))}
        </section>
        {ranked.length > 3 && (
          <ol className="ranking" start={4}>
            {ranked.slice(3).map((r) => (
              <li key={r.player.id} className={r.player.id === meId ? 'me' : ''}>
                <span className="pos">{r.position}º</span>
                <Avatar n={r.player.avatar} size={28} />
                <span className="nm">{r.player.name}{r.player.wasImpostor && ' 🕵️'}</span>
                <b>{r.player.points}</b>
              </li>
            ))}
          </ol>
        )}
        {me && <p className="my-place">Você ficou em <b>{me.position}º lugar</b> com <b>{me.player.points} pontos</b>.</p>}
        <p className="muted points-help">Pontos: +100 por voto certo no impostor · impostor ganha +100 por rodada que sobrevive · +300 para o time que vence.</p>
        {children}
      </div>
    </div>
  );
}
