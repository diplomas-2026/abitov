import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { api } from './api';

const TOKEN_KEY = 'abitov-token';
const USER_KEY = 'abitov-user';

const emptyUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'CLIENT',
  active: true,
};

const emptyCourseForm = {
  title: '',
  description: '',
  repeatMonths: 12,
  trainingFormat: 'Очный курс',
  active: true,
};

const emptyEnrollmentForm = {
  clientId: '',
  courseId: '',
  teacherId: '',
  notes: '',
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => safeParse(localStorage.getItem(USER_KEY)));
  const [demoUsers, setDemoUsers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollmentForm);

  useEffect(() => {
    api.demoUsers()
      .then(setDemoUsers)
      .catch(() => setDemoUsers([]));
  }, []);

  useEffect(() => {
    if (!token) {
      setDashboard(null);
      setUsers([]);
      setUser(null);
      return;
    }

    loadWorkspace(token);
  }, [token]);

  useEffect(() => {
    if (!dashboard) {
      return;
    }
    const usersFromDashboard = users.length ? users : [];
    if (user?.role === 'ADMIN' && usersFromDashboard.length === 0) {
      fetchUsers().catch(() => setUsers([]));
    }
  }, [dashboard, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = dashboard?.summary;
  const visibleUsers = useMemo(() => {
    if (user?.role !== 'ADMIN') {
      return user ? [user] : [];
    }
    return users;
  }, [user, users]);

  const clients = visibleUsers.filter((item) => item.role === 'CLIENT');
  const teachers = visibleUsers.filter((item) => item.role === 'TEACHER');
  const courses = dashboard?.courses || [];
  const enrollments = dashboard?.enrollments || [];
  const notifications = dashboard?.notifications || [];

  async function loadWorkspace(currentToken) {
    setLoading(true);
    setError('');
    try {
      const [dashboardData, meData] = await Promise.all([
        api.dashboard(currentToken),
        api.me(currentToken),
      ]);
      setDashboard(dashboardData);
      setUser(meData);
      localStorage.setItem(USER_KEY, JSON.stringify(meData));
      let userList = [];
      if (meData.role === 'ADMIN') {
        userList = await api.users(currentToken);
        setUsers(userList);
      } else {
        setUsers([meData]);
      }
      bootstrapForms(dashboardData, meData, userList);
    } catch (err) {
      handleSessionError(err);
    } finally {
      setLoading(false);
    }
  }

  function bootstrapForms(dashboardData, meData, userList = []) {
    if (!dashboardData) {
      return;
    }
    const nextCourse = dashboardData.courses?.[0];
    const nextClient = userList.find((item) => item.role === 'CLIENT');
    const nextTeacher = userList.find((item) => item.role === 'TEACHER');
    if (meData?.role === 'ADMIN') {
      setUserForm((prev) => ({
        ...prev,
        role: prev.role || 'CLIENT',
      }));
      setEnrollmentForm((prev) => ({
        ...prev,
        clientId: prev.clientId || String(nextClient?.id || ''),
        courseId: prev.courseId || String(nextCourse?.id || ''),
        teacherId: prev.teacherId || String(nextTeacher?.id || ''),
      }));
    } else {
      setEnrollmentForm((prev) => ({
        ...prev,
        courseId: prev.courseId || String(nextCourse?.id || ''),
      }));
    }
  }

  async function fetchUsers() {
    const list = await api.users(token);
    setUsers(list);
  }

  function handleSessionError(err) {
    const message = err instanceof Error ? err.message : 'Не удалось выполнить запрос';
    setError(message);
    if (/unauthorized/i.test(message) || /invalid credentials/i.test(message)) {
      logout();
    }
  }

  function logout() {
    setToken('');
    setUser(null);
    setDashboard(null);
    setUsers([]);
    setError('');
    setNotice('');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.login(loginForm);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setNotice(`Добро пожаловать, ${response.user.fullName}`);
    } catch (err) {
      handleSessionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    if (!token) {
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const dashboardData = await api.dashboard(token);
      setDashboard(dashboardData);
      if (user?.role === 'ADMIN') {
        const userList = await api.users(token);
        setUsers(userList);
      } else {
        setUsers(user ? [user] : []);
      }
      setNotice('Данные обновлены');
    } catch (err) {
      handleSessionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createUser(token, userForm);
      setUserForm(emptyUserForm);
      await refreshAll();
      setNotice('Пользователь создан');
    } catch (err) {
      handleSessionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCourse(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createCourse(token, {
        ...courseForm,
        repeatMonths: Number(courseForm.repeatMonths),
      });
      setCourseForm(emptyCourseForm);
      await refreshAll();
      setNotice('Курс добавлен');
    } catch (err) {
      handleSessionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateEnrollment(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createEnrollment(token, {
        clientId: Number(enrollmentForm.clientId),
        courseId: Number(enrollmentForm.courseId),
        teacherId: enrollmentForm.teacherId ? Number(enrollmentForm.teacherId) : null,
        notes: enrollmentForm.notes,
      });
      setEnrollmentForm(emptyEnrollmentForm);
      await refreshAll();
      setNotice('Слушатель записан на курс');
    } catch (err) {
      handleSessionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteEnrollment(id) {
    setBusy(true);
    setError('');
    try {
      await api.completeEnrollment(token, id, { notes: 'Закрыто через веб-интерфейс.' });
      await refreshAll();
      setNotice('Прохождение отмечено');
    } catch (err) {
      handleSessionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleRunReminders() {
    setBusy(true);
    setError('');
    try {
      const result = await api.runReminders(token);
      await refreshAll();
      setNotice(`Напоминания отправлены: ${result.sent}, создано: ${result.generated}`);
    } catch (err) {
      handleSessionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="app-shell auth-shell">
        <div className="auth-backdrop" />
        <section className="auth-card">
          <div className="eyebrow">АНО ДПО «Региональный центр охраны труда»</div>
          <h1>Система ведения клиентской базы и повторного обучения</h1>
          <p className="lede">
            Администратор управляет курсами и пользователями, преподаватель ведет обучение,
            а клиент получает напоминание о следующем прохождении на почту.
          </p>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                value={loginForm.email}
                onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                placeholder="admin@abitov.local"
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                placeholder="••••••••"
              />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Вход...' : 'Войти в систему'}
            </button>
          </form>

          <div className="demo-grid">
            <div className="section-label">Демо-доступы</div>
            <div className="demo-list">
              {demoUsers.map((item) => (
                <button
                  key={item.email}
                  type="button"
                  className="demo-chip"
                  onClick={() => setLoginForm({ email: item.email, password: item.password })}
                >
                  <span>{item.label}</span>
                  <small>{item.email}</small>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="notice notice-error">{error}</div>}
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar">
        <div>
          <div className="eyebrow">Рабочее пространство</div>
          <h1>Контур повторного обучения</h1>
        </div>

        <div className="topbar-actions">
          <button type="button" className="secondary-button" onClick={refreshAll} disabled={busy || loading}>
            Обновить данные
          </button>
          <button type="button" className="ghost-button" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <div className="eyebrow">Текущий пользователь</div>
          <h2>{user?.fullName}</h2>
          <p>{user?.email}</p>
        </div>
        <div className={`role-pill role-${user?.role?.toLowerCase()}`}>{user?.role}</div>
      </section>

      {notice && <div className="notice notice-success">{notice}</div>}
      {error && <div className="notice notice-error">{error}</div>}

      <section className="stats-grid">
        <StatCard label="Пользователи" value={stats?.totalUsers ?? 0} accent="sun" />
        <StatCard label="Клиенты" value={stats?.totalClients ?? 0} accent="sea" />
        <StatCard label="Преподаватели" value={stats?.totalTeachers ?? 0} accent="ember" />
        <StatCard label="Курсы" value={stats?.totalCourses ?? 0} accent="night" />
        <StatCard label="Активные записи" value={stats?.activeEnrollments ?? 0} accent="forest" />
        <StatCard label="Напоминания" value={stats?.upcomingRepeats ?? 0} accent="violet" />
      </section>

      <main className="content-grid">
        <section className="panel panel-large">
          <PanelHeader title="Курсы" subtitle="Программы и сроки повторного обучения" />
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Курс</th>
                  <th>Формат</th>
                  <th>Повтор</th>
                  <th>Записей</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <strong>{course.title}</strong>
                      <div className="muted">{course.description}</div>
                    </td>
                    <td>{course.trainingFormat}</td>
                    <td>{course.repeatMonths} мес.</td>
                    <td>{course.enrollmentCount}</td>
                    <td><Badge active={course.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {user?.role === 'ADMIN' && (
            <form className="inline-form" onSubmit={handleCreateCourse}>
              <h3>Новый курс</h3>
              <input
                placeholder="Название"
                value={courseForm.title}
                onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
              />
              <input
                placeholder="Формат"
                value={courseForm.trainingFormat}
                onChange={(event) => setCourseForm({ ...courseForm, trainingFormat: event.target.value })}
              />
              <input
                placeholder="Период повторения (мес.)"
                type="number"
                min="1"
                value={courseForm.repeatMonths}
                onChange={(event) => setCourseForm({ ...courseForm, repeatMonths: event.target.value })}
              />
              <textarea
                placeholder="Описание"
                value={courseForm.description}
                onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })}
              />
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={courseForm.active}
                  onChange={(event) => setCourseForm({ ...courseForm, active: event.target.checked })}
                />
                Активный курс
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                Создать курс
              </button>
            </form>
          )}
        </section>

        <section className="panel">
          <PanelHeader title="Записи" subtitle="Кто записан, кто завершил и когда повторить" />
          <div className="timeline">
            {enrollments.map((item) => (
              <article className="timeline-item" key={item.id}>
                <div className="timeline-head">
                  <div>
                    <strong>{item.client?.fullName}</strong>
                    <div className="muted">{item.course?.title}</div>
                  </div>
                  <Badge active={item.status === 'ACTIVE'} label={item.status} />
                </div>
                <div className="meta-grid">
                  <div>
                    <span>Преподаватель</span>
                    <strong>{item.teacher?.fullName || 'Не назначен'}</strong>
                  </div>
                  <div>
                    <span>Следующее обучение</span>
                    <strong>{formatDate(item.nextDueAt)}</strong>
                  </div>
                </div>
                {item.notes && <p className="muted">{item.notes}</p>}
                {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && item.status !== 'COMPLETED' && (
                  <button type="button" className="secondary-button" onClick={() => handleCompleteEnrollment(item.id)} disabled={busy}>
                    Отметить завершение
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <PanelHeader title="Уведомления" subtitle="Автоматические письма и статусы доставки" />
          <div className="timeline">
            {notifications.map((item) => (
              <article className="timeline-item" key={item.id}>
                <div className="timeline-head">
                  <div>
                    <strong>{item.subject}</strong>
                    <div className="muted">{item.client?.fullName} · {item.course?.title}</div>
                  </div>
                  <Badge active={item.status === 'SENT'} label={item.status} />
                </div>
                <p>{item.message}</p>
                <div className="meta-grid">
                  <div>
                    <span>Получатель</span>
                    <strong>{item.recipientEmail}</strong>
                  </div>
                  <div>
                    <span>Дата контроля</span>
                    <strong>{formatDate(item.dueAt)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {user?.role === 'ADMIN' && (
            <button type="button" className="primary-button" onClick={handleRunReminders} disabled={busy}>
              Запустить рассылку напоминаний
            </button>
          )}
        </section>
      </main>

      {user?.role === 'ADMIN' && (
        <section className="admin-grid">
          <section className="panel">
            <PanelHeader title="Пользователи" subtitle="Администратор управляет доступом" />
            <div className="table-wrap compact">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Роль</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((item) => (
                    <tr key={item.id}>
                      <td>{item.fullName}</td>
                      <td>{item.role}</td>
                      <td>{item.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form className="inline-form" onSubmit={handleCreateUser}>
              <h3>Новый пользователь</h3>
              <input
                placeholder="Фамилия"
                value={userForm.lastName}
                onChange={(event) => setUserForm({ ...userForm, lastName: event.target.value })}
              />
              <input
                placeholder="Имя"
                value={userForm.firstName}
                onChange={(event) => setUserForm({ ...userForm, firstName: event.target.value })}
              />
              <input
                placeholder="Email"
                value={userForm.email}
                onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
              />
              <input
                placeholder="Телефон"
                value={userForm.phone}
                onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })}
              />
              <input
                placeholder="Пароль"
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
              />
              <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                <option value="ADMIN">Администратор</option>
                <option value="TEACHER">Преподаватель</option>
                <option value="CLIENT">Клиент / слушатель</option>
              </select>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={userForm.active}
                  onChange={(event) => setUserForm({ ...userForm, active: event.target.checked })}
                />
                Активный
              </label>
              <button className="primary-button" type="submit" disabled={busy}>
                Создать пользователя
              </button>
            </form>
          </section>

          <section className="panel">
            <PanelHeader title="Новая запись" subtitle="Привязка клиента, курса и преподавателя" />
            <form className="inline-form" onSubmit={handleCreateEnrollment}>
              <select
                value={enrollmentForm.clientId}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, clientId: event.target.value })}
              >
                <option value="">Выберите клиента</option>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName}
                  </option>
                ))}
              </select>
              <select
                value={enrollmentForm.courseId}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, courseId: event.target.value })}
              >
                <option value="">Выберите курс</option>
                {courses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <select
                value={enrollmentForm.teacherId}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, teacherId: event.target.value })}
              >
                <option value="">Выберите преподавателя</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fullName}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Комментарий"
                value={enrollmentForm.notes}
                onChange={(event) => setEnrollmentForm({ ...enrollmentForm, notes: event.target.value })}
              />
              <button className="primary-button" type="submit" disabled={busy}>
                Записать на курс
              </button>
            </form>
          </section>
        </section>
      )}
    </div>
  );
}

function PanelHeader({ title, subtitle }) {
  return (
    <div className="panel-header">
      <div>
        <div className="eyebrow">{subtitle}</div>
        <h3>{title}</h3>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <article className={`stat-card stat-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Badge({ active, label }) {
  const resolvedLabel = label || (active ? 'ACTIVE' : 'INACTIVE');
  return <span className={`badge ${active ? 'badge-active' : 'badge-muted'}`}>{resolvedLabel}</span>;
}

function formatDate(value) {
  if (!value) {
    return 'Не указано';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function safeParse(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default App;
