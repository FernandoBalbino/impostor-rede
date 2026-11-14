import { useEffect, useState, type CSSProperties } from 'react';
import { HELP_LABEL, WRITE_OPTIONS, type Help, type Settings } from '../../shared/protocol.ts';
import { SERVER_URL, clearRoom, loadSession, saveSession, send, socket, useConnected, useRoom, type Session } from './net.ts';
import { initMuted, preloadSounds } from './sound.ts';
import { StudentRoom } from './Student.tsx';
import { TeacherRoom } from './Tv.tsx';
import { ItemImg, Logo, NetBackdrop } from './ui.tsx';

const SHOWCASE = ['roteador', 'switch', 'wifi', 'cabo-rede', 'ip', 'modem', 'firewall', 'placa-rede'];
export const DEFAULT_SETTINGS: Settings = { impostors: 1, writeSeconds: 60, help: 'sortear' };

export function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [notice, setNotice] = useState('');
  const room = useRoom();
  const connected = useConnected();

  const update = (s: Session | null) => {
    saveSession(s);
    setSession(s);
    if (!s) clearRoom();
  };

  // Volta para a sala sozinho a cada (re)conexão.
  useEffect(() => {
    const resume = async () => {
      const s = loadSession();
      if (!s) return;
      const r = s.role === 'teacher'
        ? await send('teacher:resume', { code: s.code, token: s.token })
        : await send('player:resume', { code: s.code, token: s.token });
      if (!r.ok) (update(null), setNotice(r.error));
    };
    socket.on('connect', resume);
    if (socket.connected) resume();
    const kicked = () => (update(null), setNotice('O professor removeu você da sala.'));
    socket.on('kicked', kicked);
    return () => void (socket.off('connect', resume), socket.off('kicked', kicked));
  }, []);

  useEffect(() => {
    preloadSounds();
    initMuted(session?.role !== 'teacher');
  }, [session?.role]);

  const banner = !connected && <div className="conn-banner">Reconectando ao servidor…</div>;

  if (session?.role === 'teacher' && room?.code === session.code)
    return (<>{banner}<TeacherRoom room={room} onLeave={() => update(null)} /></>);
  if (session?.role === 'player' && room?.code === session.code)
    return (<>{banner}<StudentRoom room={room} meId={session.playerId} /></>);
  if (session)
    return (
      <div className="center-screen">
        <div className="loader" aria-hidden="true" />
        <p>{connected ? 'Entrando na sala…' : 'Acordando o servidor… (pode levar até 1 minuto)'}</p>
        <button className="btn btn-ghost" onClick={() => update(null)}>Cancelar</button>
      </div>
    );
  return <Home notice={notice} connected={connected} onSession={(s) => (setNotice(''), update(s))} />;
}

export function SettingsFields({ value, onChange }: { value: Settings; onChange: (s: Settings) => void }) {
  return (
    <div className="settings">
      <fieldset>
        <legend>Impostores</legend>
        <div className="seg">
          {[1, 2, 3].map((n) => (
            <button type="button" key={n} className={value.impostors === n ? 'on' : ''} onClick={() => onChange({ ...value, impostors: n })}>
              🕵️ {n}
            </button>
          ))}
        </div>
        <small className="muted">Mínimo de {value.impostors * 2 + 1} alunos</small>
      </fieldset>
      <fieldset>
        <legend>Tempo para escrever</legend>
        <div className="seg">
          {WRITE_OPTIONS.map((s) => (
            <button type="button" key={s} className={value.writeSeconds === s ? 'on' : ''} onClick={() => onChange({ ...value, writeSeconds: s })}>
              {s}s
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Ajuda do impostor</span>
        <select value={value.help} onChange={(e) => onChange({ ...value, help: e.target.value as Help })}>
          {(Object.keys(HELP_LABEL) as Help[]).map((h) => <option key={h} value={h}>{HELP_LABEL[h]}</option>)}
        </select>
      </label>
    </div>
  );
}

function Home({ notice, connected, onSession }: { notice: string; connected: boolean; onSession: (s: Session) => void }) {
  const params = new URLSearchParams(location.search);
  const [mode, setMode] = useState<'home' | 'teacher' | 'student'>(params.has('sala') ? 'student' : 'home');
  const [code, setCode] = useState((params.get('sala') ?? '').toUpperCase());
  const [name, setName] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Render gratuito "dorme": já cutuca o servidor enquanto a pessoa lê a tela.
  useEffect(() => void fetch(`${SERVER_URL}/health`).catch(() => {}), []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send('teacher:create', settings);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onSession({ role: 'teacher', code: r.code, token: r.token });
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const c = code.trim().toUpperCase();
    const r = await send('player:join', { code: c, name });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onSession({ role: 'player', code: c, token: r.token, playerId: r.playerId });
  };
  const nameOk = name.replace(/[^\p{L}\p{N}]/gu, '').length >= 2;

  return (
    <div className="home">
      <NetBackdrop />
      <header className="home-top">
        <Logo />
        <span className="row">
          <a className="pill pill-link" href={`${import.meta.env.BASE_URL}atividade`}>📚 Atividade de preparação</a>
          <span className={`pill ${connected ? 'pill-ok' : ''}`}>{connected ? '● servidor online' : '○ acordando o servidor…'}</span>
        </span>
      </header>
      <main className="home-main">
        <section className="hero">
          <p className="eyebrow">Redes de computadores · revisão</p>
          <h1>
            Todos sabem o item.<br />
            <span className="grad-red">Menos um.</span>
          </h1>
          <p className="lead">
            Cada um recebe um aparelho de rede ou uma peça do computador e escreve uma frase sobre ele. O impostor só ganha uma pista. Leiam as falas na TV e votem em quem está blefando!
          </p>
          <div className="orbit" aria-hidden="true">
            {SHOWCASE.map((id, k) => (
              <span key={id} style={{ '--k': k } as CSSProperties}>
                <ItemImg id={id} thumb size={92} />
              </span>
            ))}
          </div>
        </section>
        <section className="panel-card">
          {notice && <p className="notice">{notice}</p>}
          {mode === 'home' && (
            <div className="choose">
              <button className="choice" onClick={() => setMode('student')}>
                <span className="choice-ico">🎓</span>
                <strong>Sou aluno</strong>
                <small>Entrar com o código da sala</small>
              </button>
              <button className="choice alt" onClick={() => setMode('teacher')}>
                <span className="choice-ico">📺</span>
                <strong>Sou professor</strong>
                <small>Criar a sala e passar na TV</small>
              </button>
            </div>
          )}
          {mode === 'teacher' && (
            <form className="form" onSubmit={create}>
              <h2>Criar sala</h2>
              <SettingsFields value={settings} onChange={setSettings} />
              <ul className="rules">
                <li>✍️ Todos escrevem uma frase sobre o item, sem dizer o nome.</li>
                <li>📺 A TV mostra o item e cada fala por 10 segundos.</li>
                <li>🗳️ Depois, votação no Chromebook (pode pular o voto).</li>
                <li>🏁 Impostor vence se sobrar só ele + 1 aluno ou chegar à rodada 20.</li>
              </ul>
              {error && <p className="err" role="alert">{error}</p>}
              <div className="row">
                <button type="button" className="btn btn-ghost" onClick={() => setMode('home')}>Voltar</button>
                <button className="btn btn-primary" disabled={busy || !connected}>{busy ? 'Criando…' : 'Criar sala'}</button>
              </div>
            </form>
          )}
          {mode === 'student' && (
            <form className="form" onSubmit={join}>
              <h2>Entrar na sala</h2>
              <label className="field">
                <span>Código da sala (4 letras, está na TV)</span>
                <input className="code-input" value={code} maxLength={4} autoCapitalize="characters" autoComplete="off" onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              </label>
              <label className="field">
                <span>Seu nome (obrigatório)</span>
                <input value={name} maxLength={16} autoComplete="given-name" onChange={(e) => setName(e.target.value)} required />
              </label>
              {error && <p className="err" role="alert">{error}</p>}
              <div className="row">
                <button type="button" className="btn btn-ghost" onClick={() => setMode('home')}>Voltar</button>
                <button className="btn btn-primary" disabled={busy || !connected || code.length !== 4 || !nameOk}>{busy ? 'Entrando…' : 'Entrar'}</button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
