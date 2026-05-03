import React, { useState } from 'react';
import axios from 'axios';

function Auth({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert("Заполните поля");

    const url = `https://endterm-41mm.onrender.com](https://endterm-41mm.onrender.com${isLogin ? 'login' : 'register'}`;
    
    try {
      const res = await axios.post(url, { username, password });
      
      if (isLogin) {
        if (res.data.token) {
          setToken(res.data.token);
        }
      } else {
        alert("Регистрация успешна! Теперь войдите.");
        setIsLogin(true);
      }
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || "Ошибка сервера";
      alert("Ошибка: " + message);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="management-card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 className="page-title" style={{ borderLeft: 'none', textAlign: 'center', padding: 0 }}>
          {isLogin ? 'Вход в систему' : 'Регистрация'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            className="input"
            style={{ width: '100%', marginRight: 0 }}
            type="text"
            placeholder="Имя пользователя" 
            value={username}
            onChange={e => setUsername(e.target.value)} 
          />
          <input 
            className="input"
            style={{ width: '100%', marginRight: 0 }}
            type="password" 
            placeholder="Пароль" 
            value={password}
            onChange={e => setPassword(e.target.value)} 
          />
          <button className="update-button" type="submit" style={{ width: '100%' }}>
            {isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        <div style={{ marginTop: '20px' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          </span>
          <button 
            className="logout-btn" 
            style={{ marginLeft: '10px', background: 'none', color: '#3498db', fontWeight: 'bold' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;