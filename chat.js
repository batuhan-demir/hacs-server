require('dotenv').config(); // Çevresel değişkenleri yükle
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI + 'chat-app', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB Bağlantısı Başarılı'))
    .catch(err => console.error('MongoDB Bağlantı Hatası:', err));

// Mesaj Modeli
const messageSchema = new mongoose.Schema({
    sender: String,
    recipient: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

let users = {};

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Kullanıcı kayıt olduğunda
    socket.on('register', async (username) => {
        users[username] = socket.id;
        console.log(`${username} bağlandı. ID: ${socket.id}`);

        // Teslim edilmemiş mesajları gönder
        const undeliveredMessages = await Message.find({ recipient: username, delivered: false });
        undeliveredMessages.forEach(async (msg) => {
            socket.emit('private message', { id: msg._id, from: msg.sender, message: msg.message });
            msg.delivered = true;
            await msg.save();
        });

        io.emit('user list', Object.keys(users));
    });

    // Özel mesaj
    socket.on('private message', async ({ to, message }) => {
        const recipientSocketId = users[to];
        const sender = Object.keys(users).find(key => users[key] === socket.id);

        const newMessage = new Message({
            sender,
            recipient: to,
            message,
            type: 'private',
            delivered: !!recipientSocketId
        });
        await newMessage.save();

        // Göndericiye mesajı gönder
        socket.emit('private message', { id: newMessage._id, from: sender, to, message });

        if (recipientSocketId) {
            // Alıcıya mesajı gönder
            io.to(recipientSocketId).emit('private message', { id: newMessage._id, from: sender, message });
        }
    });

    // Mesaj okundu bildirimi
    socket.on('message read', async (messageId) => {
        const message = await Message.findById(messageId);
        if (message) {
            message.read = true;
            await message.save();

            // Göndericiye "okundu" bilgisi gönder
            const senderSocketId = users[message.sender];
            if (senderSocketId) {
                io.to(senderSocketId).emit('message read', { id: message._id });
            }
        }
    });

    // Kullanıcı ayrıldığında
    socket.on('disconnect', () => {
        const username = Object.keys(users).find(key => users[key] === socket.id);
        if (username) {
            delete users[username];
            io.emit('user list', Object.keys(users));
        }
    });
});

// Sunucuyu başlat
server.listen(3000, () => {
    console.log('Sunucu 3000 portunda çalışıyor');
});
