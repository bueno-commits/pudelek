const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');

const app = express();

app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(session({
    secret: 'tajny_klucz_pudelek',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: null,
        httpOnly: true
    }
}));

// Zdefiniowani dokładnie dwaj użytkownicy
const USERS = {
    "A": "pudelek2026",
    "O": "pudelek2026"
};

const MONGO_URI = process.env.MONGO_URI || "TWOJ_LINK_Z_MONGODB_ATLAS";
mongoose.connect(MONGO_URI);

// Schemat z obsługą czasu odczytu przez drugiego użytkownika
const messageSchema = new mongoose.Schema({
    author: String,
    content: String,
    image: String,
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null } // Czas, w którym DRUGA osoba pierwszy raz otworzyła wiadomość
});

const Message = mongoose.model('Message', messageSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/user', (req, res) => {
    res.json({ username: req.session.username || null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const cleanUser = username ? username.trim().toLowerCase() : '';

    if (USERS[cleanUser] && USERS[cleanUser] === password) {
        req.session.username = cleanUser;
        res.redirect('/');
    } else {
        res.status(401).send('<h3>Błędny login lub hasło!</h3><a href="/">Wróć do logowania</a>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

app.post('/send', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Brak dostępu' });
    }
    try {
        const { message, image } = req.body;
        await Message.create({
            author: req.session.username,
            content: message,
            image: image || null
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Błąd zapisu wiadomości' });
    }
});

// Pobieranie wiadomości + weryfikacja i usuwanie po 2 minutach od odczytu
app.get('/messages', async (req, res) => {
    const currentUser = req.session.username;
    if (!currentUser) {
        return res.status(401).json({ error: 'Brak dostępu' });
    }

    try {
        const now = new Date();
        const TWO_MINUTES_MS = 2 * 60 * 1000;

        // 1. Usuń z bazy wiadomości, od których odczytu minęły już 2 minuty
        await Message.deleteMany({
            readAt: { $ne: null, $lte: new Date(now.getTime() - TWO_MINUTES_MS) }
        });

        // 2. Pobierz pozostałe wiadomości
        const messages = await Message.find().sort({ createdAt: -1 });

        // 3. Oznacz wiadomości od INNEGO użytkownika jako odczytane (jeśli jeszcze nie były)
        for (let msg of messages) {
            if (msg.author !== currentUser && !msg.readAt) {
                msg.readAt = now;
                await msg.save();
            }
        }

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Błąd pobierania wiadomości' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));