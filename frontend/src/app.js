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
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const BASE_URL = "https://endterm-41mm.onrender.com";

  const API_URL = `${BASE_URL}/api`;

  const WS_URL = BASE_URL.replace(/^http/, 'ws');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchStocks = async () => {
      try {
        const res = await axios.get(`${API_URL}/stocks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const prices = {};
        res.data.forEach(s => {
          prices[s.ticker] = { price: s.price, direction: 'neutral' };
        });
        setMarketPrices(prices);
      } catch (e) {
        console.error("Ошибка при получении акций:", e);
      }
    };

    fetchStocks();

    const ws = new WebSocket(WS_URL, token);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "TICKER_UPDATE") {
        setMarketPrices(prev => {
          const old = prev[data.payload.ticker]?.price || 0;
          const current = data.payload.price;
          const dir = current > old ? 'up' : current < old ? 'down' : 'neutral';
          return { ...prev, [data.payload.ticker]: { price: current, direction: dir } };
        });
      }
    };
    return () => ws.close();
  }, [token, WS_URL, API_URL]);

  const netWorth = useMemo(() => {
    const assets = holdings.reduce((total, s) => total + (s.amount * (marketPrices[s.ticker]?.price || 0)), 0);
    return walletBalance + assets;
  }, [walletBalance, holdings, marketPrices]);

  const handleBuy = async (ticker) => {
    try {
      const res = await axios.post(`${API_URL}/buy`, { ticker, amount: 1 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(res.data.balance);
      setHoldings(res.data.holdings);
    } catch (err) {
      alert(err.response?.data?.message || "Ошибка при покупке");
    }
  };

  const handleUpdatePrice = async () => {
    if (!myTicker || !newPrice) return alert("Заполните все поля");
    try {
      await axios.patch(`${API_URL}/stocks/update-price`, 
        { ticker: myTicker, newPrice: parseFloat(newPrice) }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewPrice("");
      alert("Цена успешно обновлена");
    } catch (err) {
      if (err.response?.status === 403) {
        alert("У вас нет прав на изменение этого тикера");
      } else {
        alert("Ошибка при обновлении цены");
      }
    }
  };

  if (!token) return <Auth setToken={setToken} />;

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>PEX Terminal</h1>
          <p>Инвестируй в людей</p>
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
                  <div style={{
                    fontSize: '1.8rem', fontWeight: 'bold', 
                    color: data.direction === 'up' ? '#2ecc71' : data.direction === 'down' ? '#e74c3c' : '#2c3e50'
                  }}>
                    ${data.price.toFixed(2)} {data.direction === 'up' ? '▲' : data.direction === 'down' ? '▼' : ''}
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
              <h3>Управление ценой</h3>
              <p style={{ fontSize: '0.8rem', color: '#7f8c8d', marginBottom: '10px' }}>Обновлять цену может только создатель тикера</p>
              <input className="input" placeholder="Тикер (напр. BTC)" value={myTicker} onChange={e => setMyTicker(e.target.value.toUpperCase())} />
              <input className="input" type="number" placeholder="Новая цена" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              <button onClick={handleUpdatePrice} className="update-button">Обновить цену</button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Тикер</th><th>Кол-во</th><th>Тек. Цена</th><th>Итого</th></tr>
                </thead>
                <tbody>
                  {holdings.length > 0 ? (
                    holdings.map(h => (
                      <tr key={h.ticker}>
                        <td>${h.ticker}</td>
                        <td>{h.amount}</td>
                        <td>${(marketPrices[h.ticker]?.price || 0).toFixed(2)}</td>
                        <td>${(h.amount * (marketPrices[h.ticker]?.price || 0)).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" style={{ textAlign: 'center' }}>Портфель пуст</td></tr>
                  )}
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