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
  const [newValue, setNewValue] = useState('');
  const [authToken, setAuthToken] = useState(localStorage.getItem('adminToken'));

  // Загрузка данных при старте
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
      
      console.log('✅ Logged in successfully');
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

  const handleSetActive = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/active`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ value: parseInt(newValue) })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          setAuthToken(null);
          setIsAdmin(false);
        }
        throw new Error(data.error || 'Не удалось установить значение');
      }

      setActiveValue(data.value);
      setNewValue('');
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
        <header className="header">
          <h1>🎲 Генератор Чисел</h1>
          <p className="subtitle">Простой и надежный генератор случайных чисел</p>
        </header>

        {error && (
          <div className="alert alert-error">
            ❌ {error}
          </div>
        )}

        {/* Основной блок генератора */}
        <div className="main-card">
          {generatedValue !== null && (
            <div className="generated-result">
              <h3>Сгенерировано:</h3>
              <div className="generated-value">{generatedValue}</div>
            </div>
          )}

          <button 
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading || activeValue === null}
          >
            {loading ? 'Генерация...' : '🎯 Сгенерировать'}
          </button>

          {/* Дополнительные настройки (неактивные) */}
          <div id="description" className="number">
            новую последовательность из
            <div id="slider" data-min="1" data-max="50" data-val="1" className="ui-slider ui-slider-horizontal ui-widget ui-widget-content ui-corner-all">
              <div className="ui-slider-range ui-widget-header ui-corner-all ui-slider-range-min" style={{width: '0%'}}></div>
              <span className="ui-slider-handle ui-state-default ui-corner-all" tabIndex="0" style={{left: '0%'}}></span>
            </div>
            <span id="slider-val" data-words="случайного числа,случайных чисел,случайных чисел">1 случайного числа</span>
            
            <div id="number-from">
              <label className="sel">
                <input type="radio" name="from" value="range" defaultChecked aria-label="из диапазона" />
                <span>из диапазона</span>
              </label> или{' '}
              <label>
                <input type="radio" name="from" value="list" aria-label="из списка" />
                <span>из списка</span>
              </label>
              <br />
              <ul>
                <li className="number-from-range sel">
                  от <input id="number-start" type="text" maxLength="9" defaultValue="1" autoComplete="off" aria-label="от" />
                  {' '}до <input id="number-end" type="text" maxLength="9" defaultValue="100" autoComplete="off" aria-label="до" />
                </li>
                <li className="number-from-list">
                  <textarea id="number-list" maxLength="8388607" autoComplete="off" placeholder="укажите список целых чисел" aria-label="укажите список целых чисел"></textarea>
                </li>
              </ul>
            </div>

            <div id="number-exclude">
              <label>
                <input type="checkbox" aria-label="исключить числа" /> исключить числа
              </label>
              <textarea id="number-exclude-list" maxLength="8388607" autoComplete="off" placeholder="укажите список целых чисел" aria-label="укажите список целых чисел"></textarea>
            </div>

            <div id="number-unique">
              <label>
                <input type="checkbox" aria-label="исключить повторения" /> исключить повторения
              </label>
            </div>

            <div id="number-record">
              <span>Записать видео генерации</span>
              <i className="fa fa-question-circle" title="Разрешите доступ к вашему экрану что бы начать запись видео. По окончанию записи закройте доступ. Записанное видео будет сохранено на ваш компьютер автоматически."></i>
            </div>
          </div>
        </div>

        {/* Панель администратора */}
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

              <form className="admin-form" onSubmit={handleSetActive}>
                <label>Установить новое значение:</label>
                <div className="input-group">
                  <input
                    type="number"
                    placeholder="Введите число"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
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
