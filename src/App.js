import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [activeValue, setActiveValue] = useState(null);
  const [generatedValue, setGeneratedValue] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newValues, setNewValues] = useState('');
  const [authToken, setAuthToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    fetchActiveValue();
    fetchHistory();
    if (authToken) {
      checkAdminSession();
    }
  }, []);

  const checkAdminSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/check`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      setIsAdmin(data.authenticated);
      
      if (!data.authenticated) {
        localStorage.removeItem('adminToken');
        setAuthToken(null);
      }
    } catch (err) {
      console.error('Error checking admin session:', err);
      localStorage.removeItem('adminToken');
      setAuthToken(null);
    }
  };

  const fetchActiveValue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/active`);
      const data = await response.json();
      setActiveValue(data.value);
    } catch (err) {
      console.error('Error fetching active value:', err);
      setError('Ошибка загрузки данных');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/history`);
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Не удалось сгенерировать число');
      }
      
      const data = await response.json();
      setGeneratedValue(data.value);
      fetchHistory();
      fetchActiveValue();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: adminUsername, 
          password: adminPassword 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Неверные учетные данные');
      }

      localStorage.setItem('adminToken', data.token);
      setAuthToken(data.token);
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminUsername('');
      setAdminPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch(`${API_URL}/api/admin/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('adminToken');
      setAuthToken(null);
      setIsAdmin(false);
    }
  };

  const handleSetValues = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const values = newValues
        .split(/[\s,;\n]+/)
        .map(v => v.trim())
        .filter(v => v !== '')
        .map(v => parseInt(v))
        .filter(v => !isNaN(v));

      if (values.length === 0) {
        throw new Error('Введите хотя бы одно корректное число');
      }

      const response = await fetch(`${API_URL}/api/admin/active`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ values: values })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          setAuthToken(null);
          setIsAdmin(false);
        }
        throw new Error(data.error || 'Не удалось установить значения');
      }

      setActiveValue(data.nextValue);
      setNewValues('');
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        {/* Основной блок генератора */}
        <div className="main-card">
          <h2 className="random-title">Случайное число:</h2>
          
                   <div className="generated-number flip-number">
            {generatedValue !== null ? generatedValue : (activeValue !== null ? activeValue : '—')}
          </div>


          <div className="promo-links">
            <a href="#" className="promo-link">Проводите розыгрыши во ВКонтакте?</a>
            <a href="#" className="promo-link">Мы поможем определить победителя!</a>
          </div>

          <button 
            className="generate-button"
            onClick={handleGenerate}
            disabled={loading || activeValue === null}
          >
            {loading ? 'Генерация...' : 'Сгенерировать'}
          </button>

          {/* Настройки */}
          <div className="settings-section">
            <p className="settings-title">новую последовательность из</p>
            
            <div className="slider-container">
              <input type="range" min="1" max="50" defaultValue="1" className="slider" />
              <span className="slider-value">1 случайного числа</span>
            </div>

            <div className="radio-group">
              <label className="radio-label selected">
                <input type="radio" name="from" value="range" defaultChecked />
                <span>из диапазона</span>
              </label>
              <span className="radio-separator">или</span>
              <label className="radio-label">
                <input type="radio" name="from" value="list" />
                <span>из списка</span>
              </label>
            </div>

            <div className="range-inputs">
              <span>от</span>
              <input type="number" className="range-input" defaultValue="1" />
              <span>до</span>
              <input type="number" className="range-input" defaultValue="100" />
            </div>

            <div className="checkbox-option">
              <label>
                <input type="checkbox" />
                <span>исключить числа</span>
              </label>
            </div>

            <div className="additional-links">
              <a href="#" className="link-with-icon">Записать видео генерации ⓘ</a>
              <a href="#" className="link-with-icon">Приложение в ВК 🔗</a>
              <a href="#" className="link">Виджет ГСЧ на сайт</a>
            </div>
          </div>
        </div>

        {/* Панель администратора */}
        {error && (
          <div className="alert alert-error">
            ❌ {error}
          </div>
        )}

        <div className="admin-section">
          {!isAdmin ? (
            <div>
              <button 
                className="admin-toggle-btn"
                onClick={() => setShowAdminLogin(!showAdminLogin)}
              >
                🔐 Вход для администратора
              </button>

              {showAdminLogin && (
                <form className="admin-login-form" onSubmit={handleAdminLogin}>
                  <h3>Вход в панель администратора</h3>
                  <input
                    type="text"
                    placeholder="Логин"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={loading}>
                    {loading ? 'Вход...' : 'Войти'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="admin-panel">
              <div className="admin-header">
                <h3>⚙️ Панель администратора</h3>
                <button className="logout-btn" onClick={handleAdminLogout}>
                  Выйти
                </button>
              </div>

              <form className="admin-form" onSubmit={handleSetValues}>
                <label>Установить серию чисел:</label>
                <p className="admin-hint">
                  Введите числа через пробел, запятую или с новой строки
                </p>
                <textarea
                  className="values-input"
                  placeholder="Например: 5, 10, 15, 20"
                  value={newValues}
                  onChange={(e) => setNewValues(e.target.value)}
                  rows="4"
                  required
                />
                <button type="submit" disabled={loading}>
                  {loading ? 'Сохранение...' : 'Добавить серию'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* История */}
        <div className="history-section">
          <h3>📜 История генераций</h3>
          <div className="history-list">
            {history.length > 0 ? (
              history.map((item, index) => (
                <div key={index} className="history-item">
                  <span className="history-value">{item.value}</span>
                  <span className="history-actor">
                    {item.actor === 'admin' ? '👨‍💼 Админ' : '👤 Пользователь'}
                  </span>
                  <span className="history-time">
                    {new Date(item.timestamp).toLocaleString('ru-RU')}
                  </span>
                </div>
              ))
            ) : (
              <p className="no-history">История пуста</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

