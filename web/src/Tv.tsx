// Tela do professor: é ela que vai para a TV. Controles discretos no topo; nada secreto aparece aqui.
import { useEffect, useState, type CSSProperties } from 'react';
import { ITEM_BY_ID } from '../../shared/catalog.ts';
import { MAX_ROUNDS, PHRASE_MS, VOTE_MS, minPlayers, showIndex, type PublicRoom, type TeacherAction } from '../../shared/protocol.ts';
import { SettingsFields } from './App.tsx';
import { SERVER_URL, send } from './net.ts';
import { FinalScene, ResultScene, gameOver } from './Scenes.tsx';
import { play } from './sound.ts';
import { Avatar, ItemImg, Logo, NetBackdrop, SoundToggle, Countdown, avatarColor, useOnce, useTicker } from './ui.tsx';

const JOIN_URL = `${location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, '');

export function TeacherRoom({ room, onLeave }: { room: PublicRoom; onLeave: () => void }) {
  const [error, setError] = useState('');
  const act = async (action: TeacherAction, playerId?: string) => {
    const r = await send('teacher:action', { action, playerId });
    setError(r.ok ? '' : r.error);
  };
  // Mantém o Render acordado durante a aula (ele dorme sem requisições HTTP).
  useEffect(() => {
    const id = setInterval(() => void fetch(`${SERVER_URL}/health`).catch(() => {}), 4 * 60_000);
    return () => clearInterval(id);
  }, []);
  useOnce(room.phase === 'voting' ? `v${room.round}` : null, () => play('votacao'));

  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  const alive = room.players.filter((p) => p.alive);
  const playing = room.phase !== 'lobby' && room.phase !== 'finished';

  return (
    <div className={`app tv phase-${room.phase}`}>
      <NetBackdrop />
      <header className="topbar">
        <Logo small />
        <span className="pill">Sala <b>{room.code}</b></span>
        {playing && <span className="pill">Rodada <b>{room.round}</b>/{MAX_ROUNDS}</span>}
        {playing && <span className="pill">🟢 <b>{alive.length}</b> na rede</span>}
        <span className="pill pill-red">🕵️ {room.settings.impostors} {room.settings.impostors > 1 ? 'impostores' : 'impostor'}</span>
        <div className="topbar-end">
          <Controls room={room} act={act} />
          <SoundToggle />
          <button className="icon-btn" onClick={fullscreen} title="Tela cheia">⛶</button>
          {playing && (
            <button className="btn btn-sm btn-danger" onClick={() => confirm('Encerrar a partida agora?') && act('end')}>Encerrar</button>
          )}
          {room.phase === 'lobby' && <button className="btn btn-sm btn-ghost" onClick={() => confirm('Fechar a sala?') && onLeave()}>Sair</button>}
        </div>
      </header>
      {error && <p className="toast" role="alert" onClick={() => setError('')}>{error}</p>}
      <main className="stage" key={`${room.phase}-${room.round}`}>
        {room.phase === 'lobby' && <Lobby room={room} act={act} />}
        {room.phase === 'writing' && <WritingTv room={room} />}
        {room.phase === 'reveal' && <RevealTv room={room} />}
        {room.phase === 'voting' && <VotingTv room={room} />}
        {room.phase === 'result' && <ResultScene room={room} tv />}
        {room.phase === 'finished' && (
          <FinalScene room={room} tv>
            <div className="row center">
              <button className="btn btn-primary btn-xl" onClick={() => act('restart')}>Nova partida ↻</button>
              <button className="btn btn-ghost" onClick={() => confirm('Fechar a sala?') && onLeave()}>Fechar sala</button>
            </div>
          </FinalScene>
        )}
      </main>
    </div>
  );
}

function Controls({ room, act }: { room: PublicRoom; act: (a: TeacherAction) => void }) {
  switch (room.phase) {
    case 'writing':
      return <button className="btn btn-sm" onClick={() => act('endWriting')}>Encerrar escrita ⏭</button>;
    case 'reveal':
      return (
        <span className="ctrl-group">
          <button className="btn btn-sm" onClick={() => act('prev')} title="Fala anterior">◀</button>
          <button className="btn btn-sm" onClick={() => act(room.pausedAt === null ? 'pause' : 'resume')}>{room.pausedAt === null ? '⏸ Pausar' : '▶ Continuar'}</button>
          <button className="btn btn-sm" onClick={() => act('next')} title="Próxima fala">▶▶</button>
          <button className="btn btn-sm" onClick={() => act('openVote')}>Abrir votação 🗳️</button>
        </span>
      );
    case 'voting':
      return <button className="btn btn-sm" onClick={() => act('closeVote')}>Encerrar votação</button>;
    case 'result':
      return gameOver(room) ? null : <button className="btn btn-sm btn-primary" onClick={() => act('nextRound')}>Próxima rodada ▶</button>;
    default:
      return null;
  }
}

function Lobby({ room, act }: { room: PublicRoom; act: (a: TeacherAction, id?: string) => void }) {
  const need = minPlayers(room.settings.impostors);
  const n = room.players.length;
  return (
    <div className="lobby">
      <section className="lobby-left">
        <p className="join-hint">Entre em <b>{JOIN_URL}</b> e digite o código</p>
        <div className="code" aria-label={`Código ${room.code}`}>
          {room.code.split('').map((ch, k) => (
            <span key={k} style={{ animationDelay: `${k * 0.12}s` }}>{ch}</span>
          ))}
        </div>
        <div className="card lobby-settings">
          <SettingsFields value={room.settings} onChange={(s) => void send('teacher:settings', s)} />
        </div>
      </section>
      <section className="lobby-right">
        <h2><b>{n}</b> {n === 1 ? 'aluno conectado' : 'alunos conectados'}</h2>
        <ul className={`lobby-grid ${n <= 12 ? 'big' : ''}`}>
          {room.players.map((p) => (
            <li key={p.id} className={p.online ? '' : 'offline'} style={{ '--c': avatarColor(p.avatar) } as CSSProperties}>
              <Avatar n={p.avatar} size={n <= 12 ? 96 : 64} />
              <span>{p.name}</span>
              <button className="kick" onClick={() => confirm(`Remover ${p.name} da sala?`) && act('kick', p.id)} aria-label={`Remover ${p.name}`}>✕</button>
            </li>
          ))}
          {!n && <li className="empty">Esperando a turma entrar…</li>}
        </ul>
        <button className="btn btn-primary btn-xl" disabled={n < need} onClick={() => act('start')}>Começar partida 🚀</button>
        {n < need && <p className="muted">Faltam {need - n} {need - n === 1 ? 'aluno' : 'alunos'} para jogar com {room.settings.impostors} {room.settings.impostors > 1 ? 'impostores' : 'impostor'}.</p>}
      </section>
    </div>
  );
}

function WritingTv({ room }: { room: PublicRoom }) {
  const alive = room.players.filter((p) => p.alive);
  const out = room.players.filter((p) => !p.alive);
  const done = new Set(room.submitted);
  return (
    <div className="writing-tv">
      <div className="w-head">
        <div>
          <p className="eyebrow">Rodada {room.round}</p>
          <h1 className="big-title">Todos estão escrevendo…</h1>
          <p className="lead">Cada um descreve o item secreto <b>sem dizer o nome</b>. O impostor só tem uma pista!</p>
        </div>
        {room.writeEndsAt && <Countdown endsAt={room.writeEndsAt} total={room.settings.writeSeconds * 1000} size={150} />}
      </div>
      <div className="mystery" aria-hidden="true">
        <div className="mystery-card"><span>?</span></div>
      </div>
      <ul className="crowd">
        {alive.map((p, k) => (
          <li key={p.id} className={done.has(p.id) ? 'done' : ''} style={{ '--c': avatarColor(p.avatar), '--k': k } as CSSProperties}>
            <span className="bubble">{done.has(p.id) ? '✓' : <i className="dots"><b /><b /><b /></i>}</span>
            <Avatar n={p.avatar} size={alive.length <= 8 ? 130 : alive.length <= 16 ? 100 : 76} />
            <span className="name">{p.name}</span>
          </li>
        ))}
      </ul>
      <p className="progress-text"><b>{done.size}</b> de {alive.length} enviaram a frase</p>
      {out.length > 0 && (
        <p className="out-row">Fora do jogo: {out.map((p) => <Avatar key={p.id} n={p.avatar} size={30} out />)}</p>
      )}
    </div>
  );
}

function RevealTv({ room }: { room: PublicRoom }) {
  const now = useTicker(150);
  const idx = showIndex(room, now);
  const n = room.phrases.length;
  useOnce(`${room.round}:${Math.min(idx, n - 1)}`, () => play(idx < 0 ? 'revelar' : 'fala'));
  if (idx < 0 || !n) return <ItemReveal itemId={room.itemId!} />;
  const k = Math.min(idx, n - 1);
  const elapsed = (room.pausedAt ?? now) - room.showAt! - k * PHRASE_MS;
  return <PhraseSlide key={k} room={room} index={k} elapsed={elapsed} />;
}

function ItemReveal({ itemId }: { itemId: string }) {
  const item = ITEM_BY_ID[itemId];
  return (
    <div className="item-reveal">
      <div className="rays" aria-hidden="true" />
      <p className="eyebrow reveal-kicker">O item da rodada era…</p>
      <div className="reveal-img"><ItemImg id={itemId} size={420} /></div>
      <h1 className="reveal-name">{item.name}</h1>
      <p className="reveal-summary">{item.summary}</p>
    </div>
  );
}

function PhraseSlide({ room, index, elapsed }: { room: PublicRoom; index: number; elapsed: number }) {
  const ph = room.phrases[index];
  const p = room.players.find((x) => x.id === ph.playerId);
  const words = ph.text ? ph.text.split(' ') : [];
  return (
    <div className={`phrase-slide ${room.pausedAt !== null ? 'paused' : ''}`} style={{ '--c': avatarColor(p?.avatar ?? 1) } as CSSProperties}>
      <div className="ps-top">
        <span className="pill">Fala <b>{index + 1}</b> de {room.phrases.length}</span>
        <span className="ps-item"><ItemImg id={room.itemId!} thumb size={48} /> {ITEM_BY_ID[room.itemId!].name}</span>
      </div>
      <div className="ps-body">
        <div className="ps-who">
          {p && <Avatar n={p.avatar} size={240} />}
          <h2>{p?.name ?? 'Aluno'}</h2>
        </div>
        <blockquote className="ps-bubble">
          {words.length ? (
            words.map((w, k) => <span key={k} style={{ animationDelay: `${0.35 + k * 0.12}s` }}>{w} </span>)
          ) : (
            <em className="empty-phrase">(não escreveu nada a tempo… 🤔)</em>
          )}
        </blockquote>
      </div>
      <div className="ps-bar"><i style={{ animationDelay: `${-Math.max(0, elapsed)}ms`, animationDuration: `${PHRASE_MS}ms` }} /></div>
      {room.pausedAt !== null && <p className="paused-tag">⏸ Pausado</p>}
    </div>
  );
}

function VotingTv({ room }: { room: PublicRoom }) {
  const voted = new Set(room.voted);
  const alive = room.players.filter((p) => p.alive);
  const item = ITEM_BY_ID[room.itemId!];
  return (
    <div className="vote-tv">
      <div className="v-head">
        <ItemImg id={item.id} size={110} className="v-item" />
        <div className="v-title">
          <p className="eyebrow">Item: {item.name}</p>
          <h1 className="big-title">Quem é o impostor?</h1>
          <p className="lead">Votem no Chromebook. Também dá para <b>pular o voto</b>.</p>
        </div>
        <div className="v-count">
          {room.voteEndsAt && <Countdown endsAt={room.voteEndsAt} total={VOTE_MS} size={130} />}
          <p><b>{voted.size}</b>/{alive.length} votaram</p>
        </div>
      </div>
      <ul className={`summary ${room.phrases.length <= 8 ? 'few' : ''}`} style={{ '--cols': room.phrases.length <= 4 ? 2 : room.phrases.length <= 12 ? 3 : 4 } as CSSProperties}>
        {room.phrases.map((ph, k) => {
          const p = room.players.find((x) => x.id === ph.playerId);
          if (!p) return null;
          return (
            <li key={ph.playerId} className={voted.has(p.id) ? 'voted' : ''} style={{ '--c': avatarColor(p.avatar), '--k': k } as CSSProperties}>
              <Avatar n={p.avatar} size={room.phrases.length <= 8 ? 84 : 56} />
              <div>
                <b>{p.name}</b>
                <p>{ph.text ? `“${ph.text}”` : <em>(não escreveu)</em>}</p>
              </div>
              {voted.has(p.id) && <span className="voted-badge">✓ votou</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
