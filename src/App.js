import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function App() {
  const [activeValue, setActiveValue] = useState(null);
  const [generatedValue, setGeneratedValue] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newValues, setNewValues] = useState("");
  const [authToken, setAuthToken] = useState(localStorage.getItem("adminToken"));

  // UI controls (как в макете; пока без влияния на API)
  const [seqCount, setSeqCount] = useState(1);
  const [sourceMode, setSourceMode] = useState("range"); // range | list
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState("100");
  const [exclude, setExclude] = useState("");

  const shownNumber = useMemo(() => {
    if (generatedValue !== null) return generatedValue;
    if (activeValue !== null) return activeValue;
    return "—";
  }, [generatedValue, activeValue]);

  useEffect(() => {
    fetchActiveValue();
    fetchHistory();
    if (authToken) checkAdminSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminSession = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/check`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      setIsAdmin(Boolean(data.authenticated));
      if (!data.authenticated) {
        localStorage.removeItem("adminToken");
        setAuthToken(null);
      }
    } catch (err) {
      localStorage.removeItem("adminToken");
      setAuthToken(null);
    }
  };

  const fetchActiveValue = async () => {
    try {
      const response = await fetch(`${API_URL}/api/active`);
      const data = await response.json();
      setActiveValue(data.value);
    } catch (err) {
      setError("Ошибка загрузки данных");
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/history`);
      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      // history optional
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // если позже добавишь поддержку диапазона/исключений на бэкенде — можно передавать body
        body: JSON.stringify({
          // пока “декоративно”
          seqCount,
          sourceMode,
          rangeFrom,
          rangeTo,
          exclude,
        }),
      });

      if (!response.ok) throw new Error("Не удалось сгенерировать число");

      const data = await response.json();
      setGeneratedValue(data.value);
      fetchHistory();
      fetchActiveValue();
    } catch (err) {
      setError(err.message || "Ошибка");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Неверные учетные данные");

      localStorage.setItem("adminToken", data.token);
      setAuthToken(data.token);
      setIsAdmin(true);
      setAdminUsername("");
      setAdminPassword("");
    } catch (err) {
      setError(err.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch(`${API_URL}/api/admin/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (err) {
      // ignore
    } finally {
      localStorage.removeItem("adminToken");
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
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => parseInt(v, 10))
        .filter((v) => !Number.isNaN(v));

      if (values.length === 0) throw new Error("Введите хотя бы одно корректное число");

      const response = await fetch(`${API_URL}/api/admin/active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ values }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          setAuthToken(null);
          setIsAdmin(false);
        }
        throw new Error(data.error || "Не удалось установить значения");
      }

      setActiveValue(data.nextValue);
      setNewValues("");
      fetchHistory();
    } catch (err) {
      setError(err.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-[#333]">
      {/* Header */}
      <header className="header-bg w-full h-[85px] relative z-10">
        <div className="max-w-[980px] mx-auto h-full flex items-start px-2">
          {/* Logo */}
          <div className="logo-ribbon w-[110px] h-[95px] flex items-center justify-center rounded-b-md mr-6 relative top-[-5px]">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-[#222] font-['Lobster'] text-3xl no-underline transform -rotate-3 mt-2"
            >
              RandStuff
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 h-full flex items-center justify-between pt-2">
            <a href="#"
              onClick={(e) => e.preventDefault()}
              className="menu-item active flex flex-col items-center gap-1 group w-16 text-center no-underline"
            >
              <div className="menu-icon text-2xl font-bold font-sans text-white">123</div>
              <span className="menu-text text-[11px] text-white leading-tight">Числа</span>
            </a>

            <a href="#" onClick={(e) => e.preventDefault()}
              className="menu-item flex flex-col items-center gap-1 group w-20 text-center no-underline text-gray-300"
            >
              <i className="menu-icon fa-solid fa-trophy text-xl"></i>
              <span className="menu-text text-[11px] leading-tight">Определить<br />победителя</span>
            </a>

            <a href="#" onClick={(e) => e.preventDefault()}
              className="menu-item flex flex-col items-center gap-1 group w-16 text-center no-underline text-gray-300"
            >
              <div className="menu-icon text-xl font-bold tracking-widest">***</div>
              <span className="menu-text text-[11px] leading-tight">Пароли</span>
            </a>

            <a href="#" onClick={(e) => e.preventDefault()}
              className="menu-item flex flex-col items-center gap-1 group w-16 text-center no-underline text-gray-300"
            >
              <i className="menu-icon fa-solid fa-dharmachakra text-xl"></i>
              <span className="menu-text text-[11px] leading-tight">Колесо<br />фортуны</span>
            </a>

            <a href="#" onClick={(e) => e.preventDefault()}
              className="menu-item flex flex-col items-center gap-1 group w-16 text-center no-underline text-gray-300"
            >
              <div className="menu-icon text-xl font-bold">???</div>
              <span className="menu-text text-[11px] leading-tight">Вопросы</span>
            </a>

            <a href="#" onClick={(e) => e.preventDefault()}
              className="menu-item flex flex-col items-center gap-1 group w-20 text-center no-underline text-gray-300"
            >
              <i className="menu-icon fa-solid fa-ticket text-xl"></i>
              <span className="menu-text text-[11px] leading-tight">Счастливые<br />билеты</span>
            </a>

            <a href="#" onClick={(e) => e.preventDefault()}
              className="menu-item flex flex-col items-center gap-1 group w-16 text-center no-underline text-gray-300"
            >
              <i className="menu-icon fa-solid fa-scroll text-xl"></i>
              <span className="menu-text text-[11px] leading-tight">Мудрости</span>
            </a>

            <a href="#" onClick={(e) => e.preventDefault()}
              className="menu-item flex flex-col items-center gap-1 group w-20 text-center no-underline text-gray-300"
            >
              <span className="menu-icon fa-stack" style={{ fontSize: "0.7rem" }}>
                <i className="fa-solid fa-circle fa-stack-2x"></i>
                <i className="fa-solid fa-8 fa-stack-1x fa-inverse"></i>
              </span>
              <span className="menu-text text-[11px] leading-tight mt-1">Ответы и<br />предсказания</span>
            </a>

            {/* Admin button */}
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="text-gray-200 text-[12px] px-2 py-1 rounded hover:text-[#ffcc00]"
              title="Админ"
            >
              <i className="fa-solid fa-user-gear mr-1"></i>
              Админ
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-[980px] mx-auto pt-12 pb-10 text-center px-3">
        <h1 className="text-[32px] text-black mb-2 font-normal">Случайное число:</h1>

        <div className="text-[160px] leading-none font-normal text-black mb-4 tracking-tighter">
          {shownNumber}
        </div>

        <div className="mb-8">
          <a href="#" onClick={(e) => e.preventDefault()} className="link-dashed text-[13px]">
            Проводите розыгрыш во ВКонтакте?
          </a>
          <br />
          <a href="#" onClick={(e) => e.preventDefault()} className="link-dashed text-[13px]">
            Мы поможем определить победителя!
          </a>
        </div>

        <div className="flex justify-center mb-6">
          <button
            className="btn-generate text-[#222] text-[36px] font-bold px-12 py-2 rounded-lg select-none w-[340px]"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Генерация..." : "Сгенерировать"}
          </button>
        </div>

        {/* Controls (визуально как макет) */}
        <div className="flex flex-col items-center gap-3 text-[13px] text-[#333]">
          <div className="w-[300px] text-center">
            <div className="text-gray-600 mb-1">новую последовательность из</div>

            <input
              type="range"
              min="1"
              max="50"
              value={seqCount}
              onChange={(e) => setSeqCount(parseInt(e.target.value, 10))}
              className="w-full mb-1"
            />

            <div className="text-black">
              {seqCount} случайного{seqCount === 1 ? " числа" : " чисел"}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="source"
                checked={sourceMode === "range"}
                onChange={() => setSourceMode("range")}
                className="accent-[#cc0000]"
              />
              <span className="link-dashed border-b border-dashed border-black text-black hover:border-solid">
                из диапазона
              </span>
            </label>

            <span className="text-gray-500">или</span>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="source"
                checked={sourceMode === "list"}
                onChange={() => setSourceMode("list")}
                className="accent-[#cc0000]"
              />
              <span className="text-black">из списка</span>
            </label>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span>от</span>
            <input
              type="text"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="input-classic w-16 px-1 py-0.5 rounded-[3px] text-center bg-white focus:outline-none focus:border-gray-500"
            />
            <span>до</span>
            <input
              type="text"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="input-classic w-16 px-1 py-0.5 rounded-[3px] text-center bg-white focus:outline-none focus:border-gray-500"
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span>исключить числа</span>
            <input
              type="text"
              value={exclude}
              onChange={(e) => setExclude(e.target.value)}
              className="input-classic w-[220px] px-2 py-0.5 rounded-[3px] bg-white focus:outline-none focus:border-gray-500"
              placeholder="например: 3, 7, 15"
            />
          </div>

          {error && <div className="alert mt-2 w-full max-w-[520px] mx-auto">{error}</div>}
        </div>

        {/* History (внизу аккуратно) */}
        <div className="max-w-[980px] mx-auto mt-10 text-left">
          <div className="history-box p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold text-[#222]">История генераций</h3>
              <button
                type="button"
                className="text-[12px] link-dashed"
                onClick={fetchHistory}
              >
                обновить
              </button>
            </div>

            <div className="max-h-[280px] overflow-auto">
              {history?.length ? (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 py-2 border-b border-black/10 text-[13px]"
                  >
                    <div className="font-bold text-[#222] w-[90px]">{item.value}</div>
                    <div className="text-gray-700 w-[110px]">
                      {item.actor === "admin" ? "Админ" : "Пользователь"}
                    </div>
                    <div className="text-gray-600 flex-1 text-right">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString("ru-RU") : ""}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-600 text-[13px] py-2">История пуста</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Admin modal */}
      {showAdminModal && (
        <div className="modal-backdrop" onMouseDown={() => setShowAdminModal(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="font-bold">
                <i className="fa-solid fa-user-gear mr-2"></i>
                Администрирование
              </div>
              <button
                className="text-white/90 hover:text-white"
                onClick={() => setShowAdminModal(false)}
                type="button"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {!isAdmin ? (
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <div className="text-[13px] text-gray-700">
                    Вход в панель администратора
                  </div>

                  <input
                    className="input-classic w-full px-2 py-2 rounded"
                    placeholder="Логин"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    required
                  />

                  <input
                    className="input-classic w-full px-2 py-2 rounded"
                    placeholder="Пароль"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />

                  <button className="small-btn w-full" disabled={loading} type="submit">
                    {loading ? "Вход..." : "Войти"}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[#222]">Панель администратора</div>
                    <button className="danger-btn" type="button" onClick={handleAdminLogout}>
                      Выйти
                    </button>
                  </div>

                  <form onSubmit={handleSetValues} className="space-y-2">
                    <div className="text-[13px] text-gray-700">
                      Установить серию чисел (через пробел/запятую/с новой строки)
                    </div>

                    <textarea
                      className="input-classic w-full px-2 py-2 rounded"
                      rows={4}
                      value={newValues}
                      onChange={(e) => setNewValues(e.target.value)}
                      placeholder="Например: 10 20 30 40"
                      required
                    />

                    <button className="small-btn w-full" disabled={loading} type="submit">
                      {loading ? "Сохранение..." : "Добавить серию"}
                    </button>
                  </form>
                </div>
              )}

              {error && <div className="alert mt-3">{error}</div>}
              <div className="text-[12px] text-gray-600 mt-3">
                API: <span className="font-mono">{API_URL}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer (легкий) */}
      <footer className="py-6 text-center text-[12px] text-gray-600">
        RandStuff style UI · работает с твоим backend
      </footer>
    </div>
  );
}
