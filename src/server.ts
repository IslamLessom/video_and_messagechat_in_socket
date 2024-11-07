import express from "express";
import http from "http";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const db = new sqlite3.Database(":memory:");

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user connected", socket.id);
  });

  socket.on("signal", (data) => {
    socket.to(data.roomId).emit("signal", {
      signal: data.signal,
      from: socket.id,
    });
  });

  socket.on("chat message", (data) => {
    socket.to(data.roomId).emit("chat message", {
      message: data.message,
      from: socket.id,
    });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
