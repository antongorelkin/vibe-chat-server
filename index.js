const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`⚡ Пользователь подключился: ${socket.id}`);

  socket.on('send_message', (data) => {
    console.log('✉️ Новое сообщение на сервере:', data);

    socket.broadcast.emit('receive_message', data);
  });
  socket.on('disconnect', () => {
    console.log(`❌ Пользователь отключился: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер вебсокетов запущен на http://localhost:${PORT}`);
});
