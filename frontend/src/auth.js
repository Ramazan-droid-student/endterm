import React, { useState } from 'react';
import axios from 'axios';

function Auth({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const API_URL = "https://endterm-41mm.onrender.com"; 

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert("Заполните поля");

    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, { username, password });
      
      if (isLogin) {
        if (res.data.token) {
          setToken(res.data.token);
        }
      } else {
        alert("Регистрация успешна!");
        setIsLogin(true);
      }
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.error || "Ошибка";
      alert(message);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="management-card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 className="page-title" style={{ borderLeft: 'none', textAlign: 'center', padding: 0 }}>
          {isLogin ? 'Вход' : 'Регистрация'}
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            className="input"
            style={{ width: '100%', marginRight: 0 }}
            type="text"
            placeholder="Логин" 
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
            {isLogin ? 'Войти' : 'Создать'}
          </button>
        </form>

        <div style={{ marginTop: '20px' }}>
          <button 
            className="logout-btn" 
            style={{ background: 'none', color: '#3498db', border: 'none', cursor: 'pointer' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Нет аккаунта? Регистрация' : 'Есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;