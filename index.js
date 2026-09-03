const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Blokowanie zapisywania w pamięci podręcznej przeglądarki (Cache)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Konfiguracja tymczasowej sesji (wygaśnie po zamknięciu przeglądarki)
app.use(session({
    secret: 'tajny_klucz_pudelek',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: null, // Ciasteczko wygasa natychmiast po zamknięciu przeglądarki
        httpOnly: true
    }
}));

const MONGO_URI = process.env.MONGO_URI || "TWOJ_LINK_Z_MONGODB_ATLAS";
mongoose.connect(MONGO_URI);

const messageSchema = new mongoose.Schema({
    author: String,
    content: String,
    createdAt: { type: Date, default: Date.now, expires: 86400 }
});
const Message = mongoose.model('Message', messageSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/user', (req, res) => {
    res.json({ username: req.session.username || null });
});

app.post('/login', (req, res) => {
    const { username } = req.body;
    if (username && username.trim() !== '') {
        req.session.username = username.trim();
    }
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Czyszczenie ciasteczka po wylogowaniu
        res.redirect('/');
    });
});

app.post('/send', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Musisz być zalogowany, aby wysłać wiadomość.');
    }
    try {
        await Message.create({
            author: req.session.username,
            content: req.body.message
        });
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Błąd zapisu');
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Błąd pobierania wiadomości' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));