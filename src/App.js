import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  // === НАСТРОЙКИ ГЕНЕРАЦИИ (Client Side) ===
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(1);
  const [isUnique, setIsUnique] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // === ОСНОВНЫЕ ДАННЫЕ ===
  const [displayValue, setDisplayValue] = useState('—'); // То, что показываем на экране
  const [history, setHistory] = useState([]);
  
  // === ADMIN / API STATE ===
  const [activeValue, setActiveValue] = useState(null); // Подкрученное число с сервера
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newValues, setNewValues] = useState('');
  const [authToken, setAuthToken] = useState(localStorage.getItem('adminToken'));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // === ЭФФЕКТЫ ===
  useEffect(() => {
    // Пробуем получить данные с сервера, но не блокируем работу, если их нет
    fetchActiveValue();
    fetchHistory();
    if (authToken) {
      checkAdminSession();
    }
  }, [authToken]);

  // === ЛОГИКА ГЕНЕРАЦИИ (ЧИСТАЯ) ===
  const generateRandomNumbers = (cnt, mn, mx, unique) => {
    // Корректировка min/max если перепутаны
    const start = Math.min(mn, mx);
    const end = Math.max(mn, mx);

    if (unique) {
      const available = new Set();
      // Защита от бесконечного цикла
      if ((end - start + 1) < cnt) return Array(cnt).fill('Error');
      
      while (available.size < cnt) {
        const rnd = Math.floor(Math.random() * (end - start + 1)) + start;
        available.add(rnd);
      }
      return Array.from(available);
    } else {
      const nums = [];
      for (let i = 0; i < cnt; i++) {
        nums.push(Math.floor(Math.random() * (end - start + 1)) + start);
      }
      return nums;
    }
  };

  // === ЗАПУСК ПРОЦЕССА (АНИМАЦИЯ + ВЫБОР ИСТОЧНИКА) ===
  const handleGenerateClick = async () => {
    if (isAnimating || loading) return;

    // 1. Проверяем валидность для уникальных чисел
    if (isUnique && (Math.abs(max - min) + 1) < count) {
      setError(`Невозможно выбрать ${count} уникальных чисел из диапазона ${Math.abs(max - min) + 1}`);
      return;
    }
    setError(null);
    setLoading(true);
    setIsAnimating(true);

    // 2. Пытаемся получить "подкрученное" число с сервера (если нужно)
    let serverValue = null;
    try {
      // Пытаемся забрать значение через API (как в оригинале)
      // Если API недоступен, просто идем дальше в catch
      if (activeValue !== null) {
          // Если уже есть предзагруженное активное значение
          serverValue = activeValue;
      } else {
         // Опционально: запрос к API generate
         // const resp = await fetch(`${API_URL}/api/generate`, ...);
         // serverValue = ...
      }
    } catch (err) {
      console.log('Server generation skipped or failed, using client random');
    }

    // 3. Запускаем анимацию
    let steps = 0;
    const maxSteps = 15;
    const speed = 50;

    const interval = setInterval(() => {
      steps++;
      // Во время анимации показываем случайные числа
      const tempNums = generateRandomNumbers(count, min, max, false);
      setDisplayValue(tempNums.join(', '));

      if (steps >= maxSteps) {
        clearInterval(interval);
        
        // 4. ФИНАЛЬНЫЙ РЕЗУЛЬТАТ
        let finalResult;
        
        if (serverValue !== null) {
          // Приоритет: Данные с сервера (Админские)
          finalResult = [serverValue]; // Предполагаем, что сервер отдает одно число или массив
          // Если сервер отдает одно число, а мы хотим массив - адаптируем
          if (!Array.isArray(finalResult)) finalResult = [finalResult];
          
          // Сброс активного значения после использования
          setActiveValue(null); 
          // Тут можно вызвать fetchActiveValue() снова, чтобы подгрузить следующее
        } else {
          // Фолбэк: Честный рандом (Клиентский)
          finalResult = generateRandomNumbers(count, min, max, isUnique);
        }

        setDisplayValue(finalResult.join(', '));
        
        // Сохраняем в историю (локально + попытка отправки на сервер)
        const newItem = { 
            value: finalResult.join(', '), 
            actor: isAdmin ? 'admin' : 'user', 
            timestamp: new Date().toISOString() 
        };
        setHistory(prev => [newItem, ...prev].slice(0, 10)); // Держим последние 10
        
        setLoading(false);
        setIsAnimating(false);
      }
    }, speed);
  };


  // === API METHODS (Сохранены для совместимости) ===
  const checkAdminSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/check`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      setIsAdmin(data.authenticated);
      if (!data.authenticated) {
        localStorage.removeItem('adminToken');
        setAuthToken(null);
      }
    } catch (err) {
      // API выключен - не страшно, просто не админ
      console.log('Admin check failed (API offline?)'); 
    }
  };

  const fetchActiveValue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/active`);
      if (response.ok) {
        const data = await response.json();
        setActiveValue(data.value);
      }
    } catch (err) {
      // Игнорируем ошибку, чтобы приложение работало офлайн
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {}
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка входа');
      
      localStorage.setItem('adminToken', data.token);
      setAuthToken(data.token);
      setIsAdmin(true);
      setShowAdminLogin(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetValues = async (e) => {
    e.preventDefault();
    try {
        const values = newValues.split(/[\s,;\n]+/).map(v => parseInt(v.trim())).filter(v => !isNaN(v));
        // Отправка на сервер...
        // Для примера оставим просто лог, если сервера нет
        console.log('Setting values on server:', values);
        // Тут должен быть fetch POST
        setNewValues('');
        alert('Значения (теоретически) отправлены. Если API нет - это заглушка.');
    } catch (e) {
        setError(e.message);
    }
  };
  
  const handleAdminLogout = () => {
      localStorage.removeItem('adminToken');
      setAuthToken(null);
      setIsAdmin(false);
  };

  // === RENDER ===
  return (
    <div className="App">
      <div className="container">
        
        {/* === MAIN CARD === */}
        <div className="main-card">
          <h2 className="random-title">Случайное число:</h2>
          
          <div className="generated-number" style={{ 
              transition: 'transform 0.1s', 
              transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
              fontSize: displayValue.length > 10 ? '40px' : '60px' // Адаптивный шрифт
          }}>
            {displayValue}
          </div>

          <div className="promo-links">
            <a href="#" className="promo-link">Проводите розыгрыши во ВКонтакте?</a>
            <a href="#" className="promo-link">Мы поможем определить победителя!</a>
          </div>

          <button 
            className="generate-button"
            onClick={handleGenerateClick}
            disabled={isAnimating}
            style={{ opacity: isAnimating ? 0.7 : 1, cursor: isAnimating ? 'wait' : 'pointer' }}
          >
            {isAnimating ? 'Генерация...' : 'Сгенерировать'}
          </button>

          {/* === SETTINGS (Теперь интерактивные) === */}
          <div className="settings-section">
            <p className="settings-title">новую последовательность из</p>
            
            <div className="slider-container">
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={count} 
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="slider" 
              />
              <span className="slider-value">
                {/* Двусторонняя связь поля и слайдера */}
                <input 
                    type="number" 
                    min="1" 
                    max="50"
                    value={count}
                    onChange={(e) => {
                        let val = parseInt(e.target.value);
                        if(val > 50) val = 50;
                        if(val < 1) val = 1;
                        setCount(val || 1);
                    }}
                    style={{width: '50px', textAlign: 'center', marginRight: '5px'}}
                />
                случайного числа
              </span>
            </div>

            <div className="radio-group">
              <label className="radio-label selected">
                <input type="radio" name="from" value="range" defaultChecked />
                <span>из диапазона</span>
              </label>
              <span className="radio-separator">или</span>
              <label className="radio-label">
                <input type="radio" name="from" value="list" disabled />
                <span style={{opacity: 0.5}}>из списка (скоро)</span>
              </label>
            </div>

            <div className="range-inputs">
              <span>от</span>
              <input 
                type="number" 
                className="range-input" 
                value={min}
                onChange={(e) => setMin(parseInt(e.target.value) || 0)}
              />
              <span>до</span>
              <input 
                type="number" 
                className="range-input" 
                value={max}
                onChange={(e) => setMax(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="checkbox-option">
              <label>
                <input 
                    type="checkbox" 
                    checked={isUnique}
                    onChange={(e) => setIsUnique(e.target.checked)}
                />
                <span>исключить повторения чисел</span>
              </label>
            </div>

            <div className="additional-links">
              <a href="#" className="link-with-icon">Записать видео генерации ⓘ</a>
              <a href="#" className="link-with-icon">Приложение в ВК 🔗</a>
              <a href="#" className="link">Виджет ГСЧ на сайт</a>
            </div>
          </div>
        </div>

        {/* === ОШИБКИ === */}
        {error && (
          <div className="alert alert-error" style={{color: 'red', marginTop: '10px'}}>
            ❌ {error}
          </div>
        )}

        {/* === ADMIN SECTION (Оставлена, но не мешает) === */}
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
                  />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                  <button type="submit">Войти</button>
                </form>
              )}
            </div>
          ) : (
            <div className="admin-panel">
              <div className="admin-header">
                <h3>⚙️ Панель администратора</h3>
                <button className="logout-btn" onClick={handleAdminLogout}>Выйти</button>
              </div>
              <form className="admin-form" onSubmit={handleSetValues}>
                <label>Установить серию чисел:</label>
                <textarea
                  className="values-input"
                  placeholder="5, 10, 15..."
                  value={newValues}
                  onChange={(e) => setNewValues(e.target.value)}
                />
                <button type="submit">Добавить серию</button>
              </form>
            </div>
          )}
        </div>

        {/* === ИСТОРИЯ === */}
        <div className="history-section">
          <h3>📜 История генераций</h3>
          <div className="history-list">
            {history.length > 0 ? (
              history.map((item, index) => (
                <div key={index} className="history-item">
                  <span className="history-value">{item.value}</span>
                  <span className="history-actor">
                    {item.actor === 'admin' ? '⚙️' : '🎲'}
                  </span>
                  <span className="history-time">
                    {new Date(item.timestamp).toLocaleTimeString()}
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
