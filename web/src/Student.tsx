// Tela do aluno no Chromebook: simples, grande e com uma coisa por vez.
import { useState, type CSSProperties } from 'react';
import { CATEGORY_LABEL, ITEM_BY_ID, saysName } from '../../shared/catalog.ts';
import { MAX_ROUNDS, PHRASE_MAX, PHRASE_MIN, VOTE_MS, type Card, type PublicPlayer, type PublicRoom } from '../../shared/protocol.ts';
import { send, setMyVote, useCard, useMyVote } from './net.ts';
import { FinalScene, ResultScene } from './Scenes.tsx';
import { Avatar, Countdown, ItemImg, Logo, SoundToggle, avatarColor } from './ui.tsx';

export function StudentRoom({ room, meId }: { room: PublicRoom; meId: string }) {
  const me = room.players.find((p) => p.id === meId);
  const playing = room.phase !== 'lobby' && room.phase !== 'finished';
  return (
    <div className={`app student phase-${room.phase}`}>
      <header className="topbar">
        <Logo small />
        {me && (
          <span className="pill me-pill" style={{ '--c': avatarColor(me.avatar) } as CSSProperties}>
            <Avatar n={me.avatar} size={26} out={!me.alive} /> {me.name}
          </span>
        )}
        {playing && <span className="pill">Rodada <b>{room.round}</b>/{MAX_ROUNDS}</span>}
        <div className="topbar-end"><SoundToggle /></div>
      </header>
      <main className="st-stage" key={`${room.phase}-${room.round}`}>
        {!me ? <p className="center-msg">Carregando…</p> : <Screen room={room} me={me} />}
      </main>
    </div>
  );
}

function Screen({ room, me }: { room: PublicRoom; me: PublicPlayer }) {
  switch (room.phase) {
    case 'lobby':
      return (
        <div className="st-lobby">
          <div className="bob"><Avatar n={me.avatar} size={170} /></div>
          <h1>Você entrou, {me.name}!</h1>
          <p className="lead">Este é o seu robô. Procure por ele na TV e espere o professor começar.</p>
          <ul className="mini-rules">
            <li>📦 Você vai ver um item de rede (ou uma peça do PC).</li>
            <li>✍️ Escreva para que ele serve, <b>sem dizer o nome</b>.</li>
            <li>🕵️ Um de vocês é o impostor e não sabe qual é o item!</li>
          </ul>
        </div>
      );
    case 'writing':
      return me.alive ? <Writing room={room} me={me} /> : <Spectator />;
    case 'reveal':
      return (
        <div className="look-tv">
          <div className="eyes" aria-hidden="true"><i /><i /></div>
          <h1>Olhe para a TV!</h1>
          <p className="lead">As frases de cada um estão aparecendo lá. Descubra quem está blefando.</p>
        </div>
      );
    case 'voting':
      return me.alive ? <Voting room={room} me={me} /> : <Spectator voting />;
    case 'result':
      return <ResultScene room={room} meId={me.id} />;
    case 'finished':
      return <FinalScene room={room} meId={me.id} />;
  }
}

function Spectator({ voting }: { voting?: boolean }) {
  return (
    <div className="spectator">
      <div className="unplugged" aria-hidden="true">🔌</div>
      <h1>Você foi desconectado</h1>
      <p className="lead">{voting ? 'Você não vota mais.' : 'Agora você só assiste.'} Acompanhe pela TV e não conte nada para ninguém!</p>
    </div>
  );
}

function Writing({ room, me }: { room: PublicRoom; me: PublicPlayer }) {
  const card = useCard();
  const sent = room.submitted.includes(me.id);
  if (!card || card.round !== room.round) return <p className="center-msg">Recebendo o item…</p>;
  const names = card.role === 'crew' ? [ITEM_BY_ID[card.itemId].name] : card.help === 'dupla' ? card.options.map((id) => ITEM_BY_ID[id].name) : [];
  return (
    <div className={`writing ${card.role}`}>
      {card.role === 'crew' ? <CrewCard card={card} /> : <ImpostorCard card={card} room={room} />}
      <div className="write-box">
        {room.writeEndsAt && <Countdown endsAt={room.writeEndsAt} total={room.settings.writeSeconds * 1000} size={72} sound={false} />}
        {sent ? (
          <div className="sent">
            <span className="sent-ok">✓</span>
            <div>
              <b>Frase enviada!</b>
              <p className="muted">Espere os colegas e depois olhe para a TV.</p>
            </div>
          </div>
        ) : (
          <PhraseForm names={names} impostor={card.role === 'impostor'} />
        )}
      </div>
    </div>
  );
}

function CrewCard({ card }: { card: Extract<Card, { role: 'crew' }> }) {
  const item = ITEM_BY_ID[card.itemId];
  return (
    <section className="item-card">
      <p className="eyebrow">Item da rodada · {CATEGORY_LABEL[item.category]}</p>
      <div className="item-card-img"><ItemImg id={item.id} size={300} /></div>
      <h1>{item.name}</h1>
      <p className="summary-text">{item.summary}</p>
    </section>
  );
}

function ImpostorCard({ card, room }: { card: Extract<Card, { role: 'impostor' }>; room: PublicRoom }) {
  const allies = card.allies.map((id) => room.players.find((p) => p.id === id)).filter((p): p is PublicPlayer => !!p);
  return (
    <section className="item-card impostor-card">
      <p className="imp-badge">🕵️ Você é o IMPOSTOR</p>
      <p className="lead">Os outros estão vendo o item. Você só tem esta ajuda:</p>
      {card.help === 'dica' && (
        <div className="clue">
          <p className="eyebrow">Dica · {card.category}</p>
          <p className="clue-text">“{card.hint}”</p>
        </div>
      )}
      {card.help === 'pixel' && (
        <div className="clue">
          <p className="eyebrow">Imagem embaralhada · {card.category}</p>
          <img className="pixel-img" src={card.pixel} alt="Imagem pixelada do item" width={220} height={220} />
        </div>
      )}
      {card.help === 'dupla' && (
        <div className="clue">
          <p className="eyebrow">É um destes dois:</p>
          <div className="duo">
            {card.options.map((id) => (
              <figure key={id}>
                <ItemImg id={id} size={150} />
                <figcaption>{ITEM_BY_ID[id].name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      {allies.length > 0 && (
        <p className="allies">
          {allies.length > 1 ? 'Seus parceiros impostores:' : 'Seu parceiro impostor:'}
          {allies.map((p) => <span key={p.id}><Avatar n={p.avatar} size={28} /> {p.name}</span>)}
        </p>
      )}
    </section>
  );
}

function PhraseForm({ names, impostor }: { names: string[]; impostor: boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const clean = text.replace(/\s+/g, ' ').trim();
  const named = names.find((n) => saysName(clean, n));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (named) return setError(`Não diga o nome (“${named}”)! Descreva de outro jeito.`);
    setBusy(true);
    const r = await send('player:phrase', { text: clean });
    setBusy(false);
    if (!r.ok) setError(r.error);
  };
  return (
    <form className="phrase-form" onSubmit={submit}>
      <label htmlFor="frase">{impostor ? 'Escreva uma frase que pareça que você sabe o item:' : 'Escreva para que serve, sem dizer o nome:'}</label>
      <textarea
        id="frase" value={text} maxLength={PHRASE_MAX} rows={2} autoFocus autoComplete="off" spellCheck
        onChange={(e) => (setText(e.target.value), setError(''))}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), e.currentTarget.form?.requestSubmit())}
      />
      <div className="form-foot">
        <span className={`counter ${clean.length > PHRASE_MAX - 10 ? 'warn' : ''}`}>{clean.length}/{PHRASE_MAX}</span>
        {(error || named) && <p className="err" role="alert">{error || 'Não pode dizer o nome do item.'}</p>}
        <button className="btn btn-primary" disabled={busy || clean.length < PHRASE_MIN || !!named}>{busy ? 'Enviando…' : 'Enviar frase'}</button>
      </div>
    </form>
  );
}

function Voting({ room, me }: { room: PublicRoom; me: PublicPlayer }) {
  const myVote = useMyVote();
  const [pick, setPick] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const vote = async (target: string) => {
    setBusy(true);
    const r = await send('player:vote', { target });
    setBusy(false);
    if (r.ok) setMyVote(target);
    else setError(r.error);
  };
  if (myVote) {
    const who = room.players.find((p) => p.id === myVote);
    return (
      <div className="voted-screen">
        <span className="sent-ok big">✓</span>
        <h1>Voto enviado!</h1>
        <p className="lead">{who ? <>Você votou em <b>{who.name}</b>.</> : 'Você pulou o voto.'} Agora olhe para a TV.</p>
        <p className="muted">{room.voted.length} de {room.players.filter((p) => p.alive).length} já votaram</p>
      </div>
    );
  }
  const options = room.phrases.filter((ph) => ph.playerId !== me.id);
  const picked = room.players.find((p) => p.id === pick);
  return (
    <div className="voting">
      <div className="voting-head">
        <div>
          <h1>Quem é o impostor?</h1>
          <p className="muted">Toque em um colega e confirme. Ou pule o voto.</p>
        </div>
        {room.voteEndsAt && <Countdown endsAt={room.voteEndsAt} total={VOTE_MS} size={72} sound={false} />}
      </div>
      <ul className="vote-list">
        {options.map((ph) => {
          const p = room.players.find((x) => x.id === ph.playerId);
          if (!p?.alive) return null;
          return (
            <li key={p.id}>
              <button className={`vote-opt ${pick === p.id ? 'on' : ''}`} style={{ '--c': avatarColor(p.avatar) } as CSSProperties} onClick={() => setPick(p.id)} aria-pressed={pick === p.id}>
                <Avatar n={p.avatar} size={48} />
                <span>
                  <b>{p.name}</b>
                  <small>{ph.text ? `“${ph.text}”` : '(não escreveu)'}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="vote-actions">
        <button className="btn btn-ghost" disabled={busy} onClick={() => vote('skip')}>⏭ Pular voto</button>
        <button className="btn btn-danger-solid" disabled={busy || !pick} onClick={() => pick && vote(pick)}>
          {picked ? `Votar em ${picked.name}` : 'Escolha alguém'}
        </button>
      </div>
    </div>
  );
}
