const express = require('express');
const router = express.Router();
const User = require('../model/user'); 
const jwt = require('jsonwebtoken');


router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    const user = new User({ username, password, walletBalance: 10000 }); 
    await user.save();
    res.json({ message: 'Пользователь создан' });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(400).json({ message: ' Неверные данные' });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET);
    res.json({ token });
});

module.exports = router;