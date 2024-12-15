require('dotenv').config(); // Çevresel değişkenleri yükle
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connection successful'))
    .catch(err => console.error('MongoDB connection error:', err));

const User = require("./models/User");

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

app.use(express.static(__dirname + "/public"));

app.get('/chat/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat' , 'index.html'));
});

// Middleware: Token doğrulama
io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
        return next(new Error('Authentication error: Token missing'));
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded._id);

        if (!user) {
            return next(new Error('Authentication error: Invalid user'));
        }

        // Kullanıcı bilgilerini socket objesine ekleyelim
        socket.user = {
            id: user._id,
            name: user.name,
            role: user.role,
        };

        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
});

io.on('connection', async (socket) => {
    const { id: userID, name, role } = socket.user;

    console.log(`${name} (${userID}) connected. ID: ${socket.id}`);

    users[userID] = {
        socket: socket.id,
        userID,
        name,
        role
    };

    // Kullanıcıya giriş onayı
    socket.emit('authenticated', {
        userID,
        name,
    });

    io.emit('user list', Object.values(users));

    // Mesaj geçmişini yükleme
    socket.on('load messages', async (recipientID) => {
        if (!recipientID) {
            return socket.emit('load error', 'Invalid recipient ID');
        }

        try {
            let messages = await Message.find({
                $or: [
                    { sender: userID, recipient: recipientID },
                    { sender: recipientID, recipient: userID }
                ]
            })
                .sort({ timestamp: 1 })    // Mesajları kronolojik sırada al
                .populate('sender', { name: true }, 'User');


            socket.emit('message history', messages);
        } catch (err) {
            console.error('Error while loading message history:', err);
            socket.emit('load error', 'Failed to load message history');
        }
    });

    // Özel mesaj
    socket.on('private message', async ({ to, message }) => {
        const recipientSocketId = users[to]?.socket;

        const newMessage = new Message({
            sender: userID,
            recipient: to,
            message,
            type: 'private',
            delivered: !!recipientSocketId
        });
        await newMessage.save();

        // Göndericiye mesajı gönder
        socket.emit('private message', {
            id: newMessage._id,
            senderID: userID,
            senderName: name,
            to,
            message,
            delivered: newMessage.delivered
        });

        if (recipientSocketId) {
            // Alıcıya mesajı gönder
            io.to(recipientSocketId).emit('private message', {
                id: newMessage._id,
                senderID: userID,
                senderName: name,
                message
            });
        }
    });

    // Mesaj okundu bildirimi
    socket.on('message read', async (messageId) => {
        const message = await Message.findById(messageId);
        if (message) {
            message.read = true;
            await message.save();

            // Göndericiye "okundu" bilgisi gönder
            const senderSocketId = users[message.sender]?.socket;
            if (senderSocketId) {
                io.to(senderSocketId).emit('message read', { id: message._id });
            }
        }
    });

    // Kullanıcı ayrıldığında
    socket.on('disconnect', () => {
        delete users[userID];
        io.emit('user list', Object.values(users));
    });
});

// Sunucuyu başlat
server.listen(3000, () => {
    console.log('Server running on port 3000');
});
