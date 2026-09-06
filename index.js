const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rygorystyczne wyłączenie cache dla wszystkich zapytań
app.use((req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
});

app.use(session({
    secret: 'tajny_klucz_pudelek',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: null }
}));

const MONGO_URI = process.env.MONGO_URI || "TWOJ_LINK_Z_MONGODB_ATLAS";
mongoose.connect(MONGO_URI);

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
});
const User = mongoose.model('User', userSchema);

async function initUsers() {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            await User.create([
                { username: 'a', password: 'pudelek2026' },
                { username: 'o', password: 'pudelek2026' }
            ]);
            console.log('Utworzono domyślnych użytkowników: a oraz o');
        }
    } catch (err) {
        console.error('Błąd inicjalizacji użytkowników:', err);
    }
}
initUsers();

const messageSchema = new mongoose.Schema({
    author: String,
    content: String,
    image: String,
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null }
});
const Message = mongoose.model('Message', messageSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/user', (req, res) => {
    res.json({ username: req.session.username || null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const cleanUser = username ? username.trim().toLowerCase() : '';

    try {
        const user = await User.findOne({ username: cleanUser, password: password });
        if (user) {
            req.session.username = user.username;
            res.redirect('/');
        } else {
            res.status(401).send('<h3>Błędny login lub hasło!</h3><a href="/">Wróć do logowania</a>');
        }
    } catch (err) {
        res.status(500).send('Błąd serwera podczas logowania.');
    }
});

app.post('/change-password', async (req, res) => {
    const currentUser = req.session.username;
    if (!currentUser) return res.status(401).json({ error: 'Brak dostępu' });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim() === '') return res.status(400).json({ error: 'Hasło nie może być puste.' });

    try {
        await User.updateOne({ username: currentUser }, { password: newPassword.trim() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Błąd podczas zmiany hasła.' });
    }
});

app.post('/change-password-o', async (req, res) => {
    if (req.session.username !== 'a') return res.status(403).json({ error: 'Brak uprawnień.' });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim() === '') return res.status(400).json({ error: 'Hasło nie może być puste.' });

    try {
        await User.updateOne({ username: 'o' }, { password: newPassword.trim() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Błąd podczas zmiany hasła.' });
    }
});

app.all('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        if (req.method === 'POST') {
            res.sendStatus(200);
        } else {
            res.redirect('/');
        }
    });
});

app.post('/send', async (req, res) => {
    if (!req.session.username) return res.status(401).json({ error: 'Brak dostępu' });
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

app.get('/messages', async (req, res) => {
    const currentUser = req.session.username;
    if (!currentUser) return res.status(401).json({ error: 'Brak dostępu' });

    try {
        const now = new Date();
        const TWO_MINUTES_MS = 2 * 60 * 1000;

        // 1. Kasuj wiadomości z bazy dopiero gdy od czytania minęły PEŁNE 2 minuty
        await Message.deleteMany({
            readAt: { $ne: null, $lte: new Date(now.getTime() - TWO_MINUTES_MS) }
        });

        // 2. Jeśli zalogowany jest O -> oznacz wszystkie odczytane przez niego wiadomości
        if (currentUser === 'o') {
            await Message.updateMany(
                { author: 'a', readAt: null },
                { $set: { readAt: now } }
            );
        }

        // 3. Pobierz wiadomości
        const messages = await Message.find().sort({ createdAt: -1 });
        res.json(messages);

    } catch (err) {
        res.status(500).json({ error: 'Błąd pobierania wiadomości' });
    }
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Plik jest zbyt duży!' });
    }
    next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));