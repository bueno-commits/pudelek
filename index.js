// Zmiana własnego hasła dla zalogowanego użytkownika (np. dla A)
app.post('/change-password', async (req, res) => {
    const currentUser = req.session.username;
    if (!currentUser) {
        return res.status(401).json({ error: 'Brak dostępu' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim() === '') {
        return res.status(400).json({ error: 'Hasło nie może być puste.' });
    }

    try {
        await User.updateOne({ username: currentUser }, { password: newPassword.trim() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Błąd podczas zmiany hasła.' });
    }
});