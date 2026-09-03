const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "TWOJ_LINK_Z_MONGODB_ATLAS";
mongoose.connect(MONGO_URI);

const messageSchema = new mongoose.Schema({
    content: String,
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Znika po 24h
});

const Message = mongoose.model('Message', messageSchema);

// Strona główna
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Zapisywanie wiadomości
app.post('/send', async (req, res) => {
    try {
        await Message.create({ content: req.body.message });
        res.redirect('/'); // Po wysłaniu odświeża stronę
    } catch (err) {
        res.status(500).send('Błąd zapisu');
    }
});

// Pobieranie listy wszystkich wiadomości z bazy
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 }); // Sortowanie od najnowszych
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Błąd pobierania wiadomości' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));