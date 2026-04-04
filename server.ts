import { createServer } from "http";
import next from "next";
import { Server, Socket } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

type RoomCategory = "video-audio" | "audio-only" | "group-audio";

interface RoomUser {
  socketId: string;
  username: string;
  userId: string;
}

interface Room {
  id: string;
  name: string;
  category: RoomCategory;
  maxUsers: number;
  users: RoomUser[];
}

const rooms: Room[] = [
  { id: "1", name: "Комната 1", category: "video-audio", maxUsers: 2, users: [] },
  { id: "2", name: "Комната 2", category: "video-audio", maxUsers: 2, users: [] },
  { id: "4", name: "Комната 4", category: "audio-only", maxUsers: 2, users: [] },
  { id: "5", name: "Комната 5", category: "audio-only", maxUsers: 2, users: [] },
  { id: "7", name: "Группа 1", category: "group-audio", maxUsers: 10, users: [] },
  { id: "8", name: "Группа 2", category: "group-audio", maxUsers: 10, users: [] },
];

function getRoomsSummary() {
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    maxUsers: r.maxUsers,
    userCount: r.users.length,
    users: r.users.map((u) => ({ id: u.userId, username: u.username })),
  }));
}

function emitParticipantsUpdate(room: Room, io: Server) {
  const participants = room.users.map((u) => ({
    id: u.userId,
    username: u.username,
  }));
  io.to(`room-${room.id}`).emit("participants-update", {
    roomId: room.id,
    participants,
  });
}

function removeUserFromAllRooms(socketId: string, io: Server) {
  for (const room of rooms) {
    const idx = room.users.findIndex((u) => u.socketId === socketId);
    if (idx !== -1) {
      room.users.splice(idx, 1);

      if (room.category === "group-audio") {
        emitParticipantsUpdate(room, io);
      } else {
        io.to(`room-${room.id}`).emit("user-left", { roomId: room.id });
      }
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

    socket.on("get-room-info", ({ roomId }: { roomId: string }) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;
      socket.emit("room-info", {
        roomId: room.id,
        name: room.name,
        category: room.category,
        maxUsers: room.maxUsers,
      });
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
        if (room.users.length >= room.maxUsers) {
          socket.emit("room-full", { roomId });
          return;
        }
        if (room.users.some((u) => u.socketId === socket.id)) return;

        removeUserFromAllRooms(socket.id, io);
        room.users.push({ socketId: socket.id, username, userId });
        socket.join(`room-${roomId}`);

        io.emit("rooms-update", getRoomsSummary());

        if (room.category === "group-audio") {
          emitParticipantsUpdate(room, io);
        } else if (room.users.length === 2) {
          const otherUser = room.users.find(
            (u) => u.socketId !== socket.id,
          );
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

        if (room.category === "group-audio") {
          emitParticipantsUpdate(room, io);
        } else {
          io.to(`room-${roomId}`).emit("user-left", { roomId });
        }

        io.emit("rooms-update", getRoomsSummary());
      }
    });

    socket.on(
      "video-frame",
      ({ roomId, frame }: { roomId: string; frame: Buffer }) => {
        const room = rooms.find((r) => r.id === roomId);
        if (!room || room.category !== "video-audio") return;
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
