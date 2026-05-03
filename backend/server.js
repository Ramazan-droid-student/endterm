require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const User = require('./model/user');
const Stock = require('./model/stocks');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const clients = new Set();

mongoose.connect(process.env.MONGO_URI);

server.on('upgrade', (request, socket, head) => {
    const protocol = request.headers['sec-websocket-protocol'];
    if (!protocol) {
        socket.destroy();
        return;
    }
    try {
        const decoded = jwt.verify(protocol, process.env.JWT_SECRET);
        wss.handleUpgrade(request, socket, head, (ws) => {
            ws.user = decoded;
            wss.emit('connection', ws, request);
        });
    } catch (err) {
        socket.destroy();
    }
});

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
});

const broadcastPriceUpdate = (ticker, price) => {
    const message = JSON.stringify({
        type: "TICKER_UPDATE",
        payload: { ticker, price }
    });
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};

app.get('/api/stocks', auth, async (req, res) => {
    try {
        const stocks = await Stock.find();
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stocks/create', auth, async (req, res) => {
    try {
        const { ticker, initialPrice } = req.body;
        const user = await User.findById(req.user.id);
        
        if (user.ownedTicker) return res.status(400).json({ message: "У вас уже есть тикер" });

        const stock = new Stock({
            ticker: ticker.toUpperCase(),
            price: initialPrice,
            owner: req.user.id
        });

        await stock.save();
        user.ownedTicker = ticker.toUpperCase();
        await user.save();

        broadcastPriceUpdate(stock.ticker, stock.price);
        res.status(201).json(stock);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/stocks/update-price', auth, async (req, res) => {
    try {
        const { ticker, newPrice } = req.body;
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });

        if (!stock) return res.status(404).json({ message: "Тикер не найден" });
        if (stock.owner.toString() !== req.user.id) {
            return res.status(403).json({ message: "Запрещено: вы не владелец" });
        }

        stock.price = newPrice;
        await stock.save();

        broadcastPriceUpdate(ticker.toUpperCase(), newPrice);
        res.json({ ticker: ticker.toUpperCase(), newPrice });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/buy', auth, async (req, res) => {
    try {
        const { ticker, amount } = req.body;
        const stock = await Stock.findOne({ ticker: ticker.toUpperCase() });
        const user = await User.findById(req.user.id);

        if (!stock) return res.status(404).json({ message: "Акция не найдена" });

        const cost = stock.price * amount;
        if (user.walletBalance < cost) {
            return res.status(400).json({ message: "Недостаточно средств" });
        }

        user.walletBalance -= cost;

        if (!user.holdings) {
            user.holdings = [];
        }

        const holdingIndex = user.holdings.findIndex(h => h.ticker === ticker.toUpperCase());
        if (holdingIndex > -1) {
            user.holdings[holdingIndex].amount += Number(amount);
        } else {
            user.holdings.push({ ticker: ticker.toUpperCase(), amount: Number(amount) });
        }

        await user.save();
        res.json({ balance: user.walletBalance, holdings: user.holdings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));