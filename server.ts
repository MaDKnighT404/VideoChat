import { createServer } from "http";
import next from "next";
import { Server, Socket } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

interface RoomUser {
  socketId: string;
  username: string;
  userId: string;
}

interface Room {
  id: string;
  name: string;
  users: RoomUser[];
}

const rooms: Room[] = [
  { id: "1", name: "Комната 1", users: [] },
  { id: "2", name: "Комната 2", users: [] },
  { id: "3", name: "Комната 3", users: [] },
];

function getRoomsSummary() {
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    userCount: r.users.length,
    users: r.users.map((u) => ({ id: u.userId, username: u.username })),
  }));
}

function removeUserFromAllRooms(socketId: string, io: Server) {
  for (const room of rooms) {
    const idx = room.users.findIndex((u) => u.socketId === socketId);
    if (idx !== -1) {
      room.users.splice(idx, 1);
      io.to(`room-${room.id}`).emit("user-left", { roomId: room.id });
    }
  }
  io.emit("rooms-update", getRoomsSummary());
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
    maxHttpBufferSize: 5e6,
  });

  io.on("connection", (socket: Socket) => {
    console.log("Connected:", socket.id);

    socket.emit("rooms-update", getRoomsSummary());

    socket.on("get-rooms", () => {
      socket.emit("rooms-update", getRoomsSummary());
    });

    socket.on(
      "join-room",
      ({
        roomId,
        username,
        userId,
      }: {
        roomId: string;
        username: string;
        userId: string;
      }) => {
        if (!userId || !username) return;
        console.log(
          `[join-room] ${username} (${userId}) (${socket.id}) → room ${roomId}`,
        );
        const room = rooms.find((r) => r.id === roomId);
        if (!room) return;
        if (room.users.length >= 2) {
          socket.emit("room-full", { roomId });
          return;
        }
        if (room.users.some((u) => u.socketId === socket.id)) return;

        removeUserFromAllRooms(socket.id, io);
        room.users.push({ socketId: socket.id, username, userId });
        socket.join(`room-${roomId}`);

        io.emit("rooms-update", getRoomsSummary());

        if (room.users.length === 2) {
          const otherUser = room.users.find((u) => u.socketId !== socket.id);
          if (otherUser) {
            console.log(
              `[ready-to-call] ${socket.id} <-> ${otherUser.socketId}`,
            );
            socket.emit("ready-to-call", {
              roomId,
              initiator: true,
              partnerName: otherUser.username,
            });
            io.to(otherUser.socketId).emit("ready-to-call", {
              roomId,
              initiator: false,
              partnerName: username,
            });
          }
        }
      },
    );

    socket.on("leave-room", ({ roomId }: { roomId: string }) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;
      const idx = room.users.findIndex((u) => u.socketId === socket.id);
      if (idx !== -1) {
        room.users.splice(idx, 1);
        socket.leave(`room-${roomId}`);
        io.to(`room-${roomId}`).emit("user-left", { roomId });
        io.emit("rooms-update", getRoomsSummary());
      }
    });

    socket.on(
      "video-frame",
      ({ roomId, frame }: { roomId: string; frame: Buffer }) => {
        socket.to(`room-${roomId}`).emit("video-frame", frame);
      },
    );

    socket.on(
      "audio-data",
      ({
        roomId,
        audio,
        sampleRate,
      }: {
        roomId: string;
        audio: Buffer;
        sampleRate: number;
      }) => {
        socket
          .to(`room-${roomId}`)
          .emit("audio-data", { audio, sampleRate });
      },
    );

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
      removeUserFromAllRooms(socket.id, io);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
