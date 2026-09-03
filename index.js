const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Wyłączenie pamięci podręcznej (brak zapamiętywania sesji po zamknięciu przeglądarki)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Tymczasowa sesja
app.use(session({
    secret: 'tajny_klucz_pudelek',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: null, // Wygasa po zamknięciu przeglądarki
        httpOnly: true
    }
}));

// Zdefiniowani użytkownicy i ich hasła (Login: Hasło)
const USERS = {
    "admin": "haslo123",
    "adam": "pudelek2026",
    "gosc": "tajne"
};

const MONGO_URI = process.env.MONGO_URI || "TWOJ_LINK_Z_MONGODB_ATLAS";
mongoose.connect(MONGO_URI);

const messageSchema = new mongoose.Schema({
    author: String,
    content: String,
    createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL 24h
});
const Message = mongoose.model('Message', messageSchema);

// Strona główna
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Stan zalogowania
app.get('/user', (req, res) => {
    res.json({ username: req.session.username || null });
});

// Logowanie z loginem i hasłem
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const cleanUser = username ? username.trim() : '';

    if (USERS[cleanUser] && USERS[cleanUser] === password) {
        req.session.username = cleanUser;
        res.redirect('/');
    } else {
        res.status(401).send('<h3>Błędny login lub hasło!</h3><a href="/">Wróć do logowania</a>');
    }
});

// Wylogowanie
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Wysyłanie wiadomości (Tylko dla zalogowanych)
app.post('/send', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Brak dostępu.');
    }
    try {
        await Message.create({
            author: req.session.username,
            content: req.body.message
        });
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Błąd zapisu wiadomości');
    }
});

// Pobieranie wiadomości (TYLKO DLA ZALOGOWANYCH)
app.get('/messages', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: 'Brak dostępu. Zaloguj się, aby zobaczyć wiadomości.' });
    }
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Błąd pobierania wiadomości' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));