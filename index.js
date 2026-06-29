const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const server = http.createServer(app);

const dbPath = path.resolve(__dirname, 'vibe-chat.db');
const db = new Database(dbPath, { verbose: console.log });
console.log('📦 База данных SQLite успешно подключена!');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_1_id INTEGER NOT NULL,
    user_2_id INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`⚡ Пользователь подключился: ${socket.id}`);

  socket.on('user_login', (username) => {
    try {
      const insert = db.prepare('INSERT OR IGNORE INTO users (username) VALUES(?)');
      insert.run(username);

      const user = db.prepare('SELECT id FORM users WHERE username = ?').get(username);

      socket.emit('user_authorized', { id: user.id, username });
      console.log(`👤 Пользователь ${username} вошел с ID ${user.id}`);
    } catch (err) {
      console.error('Ошибка авторизации:', err.message);
    }
  });

  socket.on('join_room', ({ chatId }) => {
    socket.join(`room_${chatId}`);
    console.log(`🚪 Сокет ${socket.id} вошел в комнату room_${chatId}`);

    const messages = db.prepare(`
      SELECT m.text, m.sender_id, u.username as sender_name, m.created_at
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
      `).all(chatId)

    socket.emit('room_history', messages);
  })

  socket.on('send_private_message', ({ chatId, senderId, text }) => {
    try {
      const insert = db.prepare('INSERT INTO messages (chat_id, sender_id, text) VALUES (?, ?, ?)');
      insert.run(chatId, senderId, text);

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      io.to(`room_${chatId}`).emit('receive_private_message', {
        text,
        senderId,
        time
      });

      console.log(`✉️ Сообщение в чате ${chatId} сохранено и разослано`);
    } catch (err) {
      console.error('Ошибка сохранения сообщения:', err.message)
    }
  })

  socket.on('disconnect', () => {
    console.log(`❌ Пользователь отключился: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер вебсокетов запущен на http://localhost:${PORT}`);
});
