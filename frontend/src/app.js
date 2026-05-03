import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Auth from './auth';
import "./css/style.css";

function App() {
  const [activePage, setActivePage] = useState('market');
  const [walletBalance, setWalletBalance] = useState(10000);
  const [holdings, setHoldings] = useState([]);
  const [marketPrices, setMarketPrices] = useState({});
  const [myTicker, setMyTicker] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [createTicker, setCreateTicker] = useState("");
  const [initialPrice, setInitialPrice] = useState(100);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchInitialData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/stocks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const initialPrices = {};
        res.data.forEach(s => {
          initialPrices[s.ticker] = { price: s.price, direction: 'neutral' };
        });
        setMarketPrices(initialPrices);
      } catch (e) {
        console.error("Ошибка загрузки данных");
      }
    };

    fetchInitialData();

    const ws = new WebSocket('ws://localhost:5000', token);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "TICKER_UPDATE") {
        setMarketPrices(prev => {
          const oldPrice = prev[data.payload.ticker]?.price || 0;
          const newPriceVal = data.payload.price;
          const direction = newPriceVal > oldPrice ? 'up' : newPriceVal < oldPrice ? 'down' : 'neutral';
          return {
            ...prev,
            [data.payload.ticker]: { price: newPriceVal, direction }
          };
        });
      }
    };

    return () => ws.close();
  }, [token]);

  const netWorth = useMemo(() => {
    const assetsValue = holdings.reduce((total, stock) => {
      const currentPrice = marketPrices[stock.ticker]?.price || 0;
      return total + (stock.amount * currentPrice);
    }, 0);
    return walletBalance + assetsValue;
  }, [walletBalance, holdings, marketPrices]);

  const handleBuy = async (ticker) => {
    try {
      const response = await axios.post('http://localhost:5000/api/buy', 
        { ticker, amount: 1 }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWalletBalance(response.data.balance);
      setHoldings(response.data.holdings);
    } catch (error) {
      alert("Ошибка: " + (error.response?.data?.message || "Сервер недоступен"));
    }
  };

  const handleCreateStock = async () => {
    if (!createTicker) return alert("Введите тикер");
    try {
      await axios.post('http://localhost:5000/api/stocks/create', 
        { ticker: createTicker.toUpperCase(), initialPrice: parseFloat(initialPrice) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Акция создана");
      setCreateTicker("");
    } catch (error) {
      alert(error.response?.data?.message || "Ошибка создания");
    }
  };

  const handleUpdatePrice = async () => {
    if (!myTicker || !newPrice) return alert("Заполните поля");
    try {
      await axios.patch('http://localhost:5000/api/stocks/update-price', 
        { ticker: myTicker, newPrice: parseFloat(newPrice) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewPrice("");
    } catch (error) {
      alert(error.response?.status === 403 ? "Нет прав" : "Ошибка");
    }
  };

  const getPriceStyle = (direction) => ({
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: direction === 'up' ? '#2ecc71' : direction === 'down' ? '#e74c3c' : '#2c3e50',
    backgroundColor: direction === 'up' ? 'rgba(46, 204, 113, 0.1)' : direction === 'down' ? 'rgba(231, 76, 60, 0.1)' : 'transparent',
    padding: '5px',
    borderRadius: '5px',
    transition: 'all 0.3s ease'
  });

  if (!token) return <Auth setToken={setToken} />;

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1 style={{ margin: 0 }}>PEX Terminal</h1>
          <p style={{ color: '#7f8c8d' }}>Инвестируй в людей</p>
        </div>
        <button onClick={() => setToken(null)} className="logout-btn">Выйти</button>
        <div className="stats-container">
          <div className="stat-box">
            <span className="label">CASH</span>
            <span className="value">${walletBalance.toFixed(2)}</span>
          </div>
          <div className="stat-box">
            <span className="label">NET WORTH</span>
            <span className="value" style={{ color: '#3498db' }}>${netWorth.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <nav className="navbar">
        <button onClick={() => setActivePage('market')} className={activePage === 'market' ? 'nav-btn-active' : 'nav-btn'}>📊 Рынок</button>
        <button onClick={() => setActivePage('portfolio')} className={activePage === 'portfolio' ? 'nav-btn-active' : 'nav-btn'}>💼 Портфель</button>
      </nav>

      <main className="content">
        {activePage === 'market' && (
          <section>
            <h2 className="page-title">Биржевые котировки</h2>
            <div className="grid">
              {Object.entries(marketPrices).map(([ticker, data]) => (
                <div key={ticker} className="market-card">
                  <div className="card-badge">LIVE</div>
                  <h3>${ticker}</h3>
                  <div style={getPriceStyle(data.direction)}>
                    ${data.price.toFixed(2)}
                    <span style={{marginLeft: '5px'}}>{data.direction === 'up' ? '▲' : data.direction === 'down' ? '▼' : ''}</span>
                  </div>
                  <button onClick={() => handleBuy(ticker)} className="buy-button">Купить</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === 'portfolio' && (
          <section>
            <h2 className="page-title">Личный кабинет</h2>
            <div className="management-card">
              <h3>Выпустить акцию</h3>
              <input className="input" placeholder="Тикер" value={createTicker} onChange={(e) => setCreateTicker(e.target.value.toUpperCase())} />
              <input className="input" type="number" value={initialPrice} onChange={(e) => setInitialPrice(e.target.value)} />
              <button onClick={handleCreateStock} className="buy-button" style={{width: 'auto', padding: '12px 20px'}}>Создать</button>
            </div>
            <div className="management-card">
              <h3>Управление ценой</h3>
              <input className="input" placeholder="Тикер" value={myTicker} onChange={(e) => setMyTicker(e.target.value.toUpperCase())} />
              <input className="input" type="number" placeholder="Цена" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              <button onClick={handleUpdatePrice} className="update-button">Обновить</button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Тикер</th><th>Кол-во</th><th>Цена</th><th>Итого</th></tr>
                </thead>
                <tbody>
                  {holdings.map(h => (
                    <tr key={h.ticker}>
                      <td>${h.ticker}</td>
                      <td>{h.amount}</td>
                      <td>${(marketPrices[h.ticker]?.price || 0).toFixed(2)}</td>
                      <td>${(h.amount * (marketPrices[h.ticker]?.price || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;