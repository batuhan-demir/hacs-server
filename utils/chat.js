const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const io = new Server(global.server);

const Message = require("../models/Message");
const User = require("../models/User");

let users = {};

// Middleware: Token doğrulama
io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token)
        return next(new Error('Authentication error: Token missing'));
    

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded._id);

        if (!user) 
            return next(new Error('Authentication error: Invalid user'));
        

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

