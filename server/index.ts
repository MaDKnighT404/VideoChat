import { createServer } from "http";
import { Server, Socket } from "socket.io";

const port = parseInt(process.env.PORT || "3001", 10);

interface RoomUser {
  socketId: string;
  username: string;
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
    users: r.users.map((u) => u.username),
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

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket) => {
  console.log("Connected:", socket.id);

  socket.emit("rooms-update", getRoomsSummary());

  socket.on("join-room", ({ roomId, username }: { roomId: string; username: string }) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    if (room.users.length >= 2) {
      socket.emit("room-full", { roomId });
      return;
    }
    if (room.users.some((u) => u.socketId === socket.id)) return;

    removeUserFromAllRooms(socket.id, io);
    room.users.push({ socketId: socket.id, username });
    socket.join(`room-${roomId}`);

    io.emit("rooms-update", getRoomsSummary());

    if (room.users.length === 2) {
      const otherUser = room.users.find((u) => u.socketId !== socket.id);
      if (otherUser) {
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
  });

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

  socket.on("offer", ({ roomId, offer }: { roomId: string; offer: RTCSessionDescriptionInit }) => {
    socket.to(`room-${roomId}`).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ roomId, answer }: { roomId: string; answer: RTCSessionDescriptionInit }) => {
    socket.to(`room-${roomId}`).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ roomId, candidate }: { roomId: string; candidate: RTCIceCandidateInit }) => {
    socket.to(`room-${roomId}`).emit("ice-candidate", { candidate, from: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    removeUserFromAllRooms(socket.id, io);
  });
});

httpServer.listen(port, () => {
  console.log(`> Socket.IO signaling server ready on port ${port}`);
});
