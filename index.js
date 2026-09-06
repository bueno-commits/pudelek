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

// 1. Zaktualizowany schemat wiadomości z nową flagą seenByAuthor
const messageSchema = new mongoose.Schema({
    author: String,
    content: String,
    image: String,
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null },
    seenByAuthor: { type: Boolean, default: false } // Flaga potwerdzająca, że autor A zobaczył status odczytu
});
const Message = mongoose.model('Message', messageSchema);

// 2. Zaktualizowana trasa pobierania wiadomości
app.get('/messages', async (req, res) => {
    const currentUser = req.session.username;
    if (!currentUser) return res.status(401).json({ error: 'Brak dostępu' });

    try {
        const now = new Date();
        const TWO_MINUTES_MS = 2 * 60 * 1000;

        // Usuwaj TYLKO wiadomości, które:
        // - zostały odczytane przez O min. 2 minuty temu
        // - ORAZ autor A przynajmniej raz wyświetlił informację o ich odczytaniu (seenByAuthor = true)
        await Message.deleteMany({
            readAt: { $ne: null, $lte: new Date(now.getTime() - TWO_MINUTES_MS) },
            seenByAuthor: true
        });

        // Jeśli odczytuje użytkownik O -> oznacz nowe wiadomości od A jako odczytane
        if (currentUser === 'o') {
            await Message.updateMany(
                { author: 'a', readAt: null },
                { $set: { readAt: now } }
            );
        }

        // Pobierz wiadomości
        const messages = await Message.find().sort({ createdAt: -1 });

        // Jeśli aktualnie zalogowany to A -> poinformuj bazę, że A właśnie ZOBACZYŁ status odczytanych wiadomości
        if (currentUser === 'a') {
            await Message.updateMany(
                { author: 'a', readAt: { $ne: null }, seenByAuthor: false },
                { $set: { seenByAuthor: true } }
            );
        }

        res.json(messages);

    } catch (err) {
        res.status(500).json({ error: 'Błąd pobierania wiadomości' });
    }
});