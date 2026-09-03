const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Wklej tu swój link z MongoDB Atlas (pamiętaj o podmieniu hasła!)
const MONGO_URI = process.env.MONGO_URI || "TWOJ_LINK_Z_MONGODB_ATLAS";

mongoose.connect(MONGO_URI);

const messageSchema = new mongoose.Schema({
    content: String,
    createdAt: { type: Date, default: Date.now, expires: 86400 } // Usuwa po 24h (86400 sek)
});

const Message = mongoose.model('Message', messageSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/send', async (req, res) => {
    await Message.create({ content: req.body.message });
    res.send('Wiadomość zapisana! Zostanie usunięta za 24h.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));