require("dotenv").config()
const express = require('express')
const http = require('http');
const path = require('path');

const i18n = require('i18n')
const cors = require('cors')
const morgan = require("morgan")

const cookieParser = require("cookie-parser")

const authRoutes = require("./routes/Auth")
const userRoutes = require("./routes/User")
const { connectToDB } = require("./database/db")

// app init
const app = express()
global.server = http.createServer(app);

// realtime comminication
require('./utils/chat');

// database connection
connectToDB()

const PORT = process.env.PORT

// i18n configuration
i18n.configure({
    locales: ['en', 'tr', 'es', 'pl'],
    directory: __dirname + '/locales',
    defaultLocale: 'en',
    queryParameter: 'lang',
    autoReload: true,
    updateFiles: false,
    cookie: 'locale',
});

// middlewares
app.use(cors({ credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(morgan("tiny"))
app.use(i18n.init);

/*
app.options('*', cors({
    origin: process.env.ORIGIN,
    credentials: true,
}));*/

app.use((req, res, next) => {
    let lang = req.query.lang || req.cookies.locale || 'en';
    if (i18n.getLocales().includes(lang)) {
        i18n.setLocale(req, lang);
        res.cookie('locale', lang);
    } else {
        i18n.setLocale(req, 'en');
    }
    next();
});

app.use(express.static(__dirname + '/public'));

app.get('/chat/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat', 'index.html'));
});


// routeMiddleware
app.use("/auth", authRoutes)
app.use("/users", userRoutes)

app.get("/", (req, res) => {
    res.status(200).json({ message: req.__("Welcome") })
})

global.server.listen(PORT, () => {
    console.log(`server [STARTED] ~ http://localhost:${PORT}`);
})
