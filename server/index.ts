// Servidor de tempo real (Render). Só troca mensagens pequenas; imagens, sons e animações ficam no GitHub Pages.
import express from 'express';
import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { ClientEvents, ServerEvents } from '../shared/protocol.ts';
import { Game, GameError, type Room } from './game.ts';

type Auth = { code: string; kind: 'teacher' } | { code: string; kind: 'player'; playerId: string };
type Sock = Socket<ClientEvents, ServerEvents, Record<string, never>, { auth?: Auth }>;

export function createGameServer(origins: string[]) {
  const app = express();
  app.disable('x-powered-by');
  const http = createServer(app);
  const io = new Server<ClientEvents, ServerEvents, Record<string, never>, { auth?: Auth }>(http, {
    cors: { origin: origins, methods: ['GET', 'POST'] },
    allowRequest: (req, cb) => cb(null, !req.headers.origin || origins.includes(req.headers.origin)),
    maxHttpBufferSize: 4096,
    perMessageDeflate: false,
    serveClient: false,
  });

  const playerSockets = (room: Room) =>
    [...io.sockets.sockets.values()].filter((s) => {
      const a = (s as Sock).data.auth;
      return a?.kind === 'player' && a.code === room.code;
    }) as Sock[];
  const playerIdOf = (s: Sock) => (s.data.auth as { playerId: string }).playerId;

  // Várias mudanças no mesmo instante viram um único envio de estado.
  const pending = new Set<string>();
  const game = new Game({
    onChange: (room) => {
      if (pending.has(room.code)) return;
      pending.add(room.code);
      queueMicrotask(() => {
        pending.delete(room.code);
        if (game.rooms.has(room.code)) io.to(room.code).emit('state', game.view(room));
      });
    },
    onMark: (room, kind, playerId) => io.to(room.code).emit('mark', { kind, playerId }),
    onCards: (room) => {
      for (const s of playerSockets(room)) s.emit('card', game.card(room, playerIdOf(s)));
    },
  });
  setInterval(() => game.cleanup(), 15 * 60_000).unref();

  app.get('/health', (_req, res) => {
    res.set('Access-Control-Allow-Origin', '*').json({ ok: true, rooms: game.rooms.size });
  });

  const handle = <T extends object>(ack: unknown, fn: () => T) => {
    if (typeof ack !== 'function') return;
    try {
      ack({ ok: true, ...fn() });
    } catch (err) {
      ack({ ok: false, error: err instanceof GameError ? err.message : 'Erro inesperado. Tente de novo.' });
      if (!(err instanceof GameError)) console.error(err);
    }
  };

  const attach = (socket: Sock, room: Room, auth: Auth) => {
    socket.data.auth = auth;
    socket.join(room.code);
    socket.emit('state', game.view(room));
    if (auth.kind === 'player') {
      socket.emit('card', game.card(room, auth.playerId));
      socket.emit('myVote', game.votedFor(room, auth.playerId));
    }
  };

  io.on('connection', (socket: Sock) => {
    const authed = () => {
      const auth = socket.data.auth ?? (() => { throw new GameError('Entre em uma sala primeiro.'); })();
      return { auth, room: game.room(auth.code) };
    };
    const teacherRoom = () => {
      const { auth, room } = authed();
      if (auth.kind !== 'teacher') throw new GameError('Só o professor pode fazer isso.');
      return room;
    };
    const player = () => {
      const { auth, room } = authed();
      if (auth.kind !== 'player') throw new GameError('Só alunos fazem isso.');
      return { room, playerId: auth.playerId };
    };

    socket.on('teacher:create', (p, ack) =>
      handle(ack, () => {
        const room = game.createRoom(p);
        attach(socket, room, { code: room.code, kind: 'teacher' });
        return { code: room.code, token: room.teacherToken };
      }));

    socket.on('teacher:resume', (p, ack) =>
      handle(ack, () => {
        const room = game.teacher(p?.code, p?.token);
        attach(socket, room, { code: room.code, kind: 'teacher' });
        return {};
      }));

    socket.on('teacher:settings', (p, ack) => handle(ack, () => (game.setSettings(teacherRoom(), p), {})));

    socket.on('teacher:action', (p, ack) =>
      handle(ack, () => {
        const room = teacherRoom();
        switch (p?.action) {
          case 'start': game.start(room); break;
          case 'endWriting': game.endWriting(room); break;
          case 'pause': case 'resume': case 'next': case 'prev': game.showControl(room, p.action); break;
          case 'openVote': game.openVote(room); break;
          case 'closeVote': game.closeVote(room); break;
          case 'nextRound': game.nextRound(room); break;
          case 'restart': game.restart(room); break;
          case 'end':
            if (room.phase === 'lobby' || room.phase === 'finished') throw new GameError('Não há partida em andamento.');
            game.finish(room, null, 'teacher');
            break;
          case 'kick': {
            const kicked = game.kick(room, p.playerId);
            for (const s of playerSockets(room))
              if (playerIdOf(s) === kicked.id) {
                s.emit('kicked');
                s.leave(room.code);
                s.data.auth = undefined;
              }
            break;
          }
          default: throw new GameError('Ação desconhecida.');
        }
        return {};
      }));

    socket.on('player:join', (p, ack) =>
      handle(ack, () => {
        const { room, player } = game.join(p?.code, p?.name);
        attach(socket, room, { code: room.code, kind: 'player', playerId: player.id });
        return { playerId: player.id, token: player.token };
      }));

    socket.on('player:resume', (p, ack) =>
      handle(ack, () => {
        const { room, player } = game.resume(p?.code, p?.token);
        attach(socket, room, { code: room.code, kind: 'player', playerId: player.id });
        game.setOnline(room, player.id, true);
        return { playerId: player.id };
      }));

    socket.on('player:phrase', (p, ack) =>
      handle(ack, () => {
        const { room, playerId } = player();
        game.submitPhrase(room, playerId, p?.text);
        return {};
      }));

    socket.on('player:vote', (p, ack) =>
      handle(ack, () => {
        const { room, playerId } = player();
        game.vote(room, playerId, p?.target);
        return {};
      }));

    socket.on('disconnect', () => {
      const auth = socket.data.auth;
      if (auth?.kind !== 'player') return;
      const room = game.rooms.get(auth.code);
      // Outra aba do mesmo aluno ainda conectada? Então continua online.
      const still = [...io.sockets.sockets.values()].some(
        (s) => s.id !== socket.id && (s as Sock).data.auth?.kind === 'player' && playerIdOf(s as Sock) === auth.playerId);
      if (room && !still) game.setOnline(room, auth.playerId, false);
    });
  });

  return { app, http, io, game };
}

if (import.meta.main) {
  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim());
  const port = Number(process.env.PORT ?? 3000);
  createGameServer(origins).http.listen(port, () => console.log(`Impostor da Rede na porta ${port} — origens: ${origins.join(', ')}`));
}
