import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Grid,
  FormControl,
  FormControlLabel,
  FormLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import './App.css';
import { api } from './api';

const TOKEN_KEY = 'abitov-token';
const USER_KEY = 'abitov-user';

const materialTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1a73e8' },
    secondary: { main: '#fbbc04' },
    background: {
      default: '#f5f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#1f1f1f',
      secondary: '#5f6368',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.03em' },
    h2: { fontWeight: 700, letterSpacing: '-0.03em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
});

const emptyUserForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  maxContact: '',
  password: '',
  role: 'CLIENT',
  active: true,
};

const emptyCourseForm = {
  title: '',
  description: '',
  repeatMonths: '12',
  trainingFormat: 'Очный курс',
  active: true,
};

const emptyEnrollmentForm = {
  clientId: '',
  courseId: '',
  teacherId: '',
  groupName: '',
  notes: '',
};

const emptyProgramForm = {
  courseId: '',
  title: '',
  description: '',
  position: 1,
  active: true,
};

const emptyLessonForm = {
  programId: '',
  title: '',
  body: '',
  position: 1,
  active: true,
};

const emptyTestForm = {
  programId: '',
  lessonId: '',
  title: '',
  passScore: 1,
  maxAttempts: 1,
  active: true,
  questions: [],
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => safeParse(localStorage.getItem(USER_KEY)));
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [demoUsers, setDemoUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    api.demoUsers()
      .then(setDemoUsers)
      .catch(() => setDemoUsers([]));
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    void refreshWorkspace(token).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshWorkspace(currentToken = token) {
    if (!currentToken) {
      return false;
    }
    setLoading(true);
    try {
      const [dashboardData, meData] = await Promise.all([
        api.dashboard(currentToken),
        api.me(currentToken),
      ]);
      setDashboard(dashboardData);
      setUser(meData);
      localStorage.setItem(USER_KEY, JSON.stringify(meData));

      if (meData.role === 'ADMIN') {
        setUsers(await api.users(currentToken));
      } else {
        setUsers([meData]);
      }
      return true;
    } catch (error) {
      notify(error);
      logout();
      return false;
    } finally {
      setLoading(false);
    }
  }

  function notify(messageOrError, severity = 'error') {
    const message = messageOrError instanceof Error ? messageOrError.message : String(messageOrError);
    setSnackbar({ open: true, message, severity });
  }

  function success(message) {
    setSnackbar({ open: true, message, severity: 'success' });
  }

  function logout() {
    setToken('');
    setUser(null);
    setDashboard(null);
    setUsers([]);
    setLoginForm({ email: '', password: '' });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function handleLogin(credentials) {
    setBusy(true);
    try {
      const response = await api.login(credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      success(`Добро пожаловать, ${response.user.fullName}`);
      return response;
    } catch (error) {
      notify(error);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  const outletContext = {
    token,
    user,
    dashboard,
    users,
    busy,
    setBusy,
    refreshWorkspace,
    notify,
    success,
    logout,
  };

  return (
    <ThemeProvider theme={materialTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              token
                ? <Navigate to="/dashboard" replace />
                : (
                  <LoginPage
                    demoUsers={demoUsers}
                    loginForm={loginForm}
                    setLoginForm={setLoginForm}
                    onLogin={handleLogin}
                    busy={busy}
                  />
                )
            }
          />

          <Route element={<ProtectedLayout loading={loading} onLogout={logout} ctx={outletContext} />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/users/new" element={<UserFormPage mode="create" />} />
            <Route path="/users/:id/edit" element={<UserFormPage mode="edit" />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:id" element={<CourseDetailPage />} />
            <Route path="/courses/new" element={<CourseFormPage mode="create" />} />
            <Route path="/courses/:id/edit" element={<CourseFormPage mode="edit" />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs/:id" element={<ProgramDetailPage />} />
            <Route path="/programs/new" element={<ProgramFormPage mode="create" />} />
            <Route path="/programs/:id/edit" element={<ProgramFormPage mode="edit" />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lessons/:id" element={<LessonDetailPage />} />
            <Route path="/lessons/new" element={<LessonFormPage mode="create" />} />
            <Route path="/lessons/:id/edit" element={<LessonFormPage mode="edit" />} />
            <Route path="/tests" element={<TestsPage />} />
            <Route path="/tests/:id" element={<TestDetailPage />} />
            <Route path="/tests/:id/take" element={<TestTakePage />} />
            <Route path="/tests/new" element={<TestFormPage mode="create" />} />
            <Route path="/tests/:id/edit" element={<TestFormPage mode="edit" />} />
            <Route path="/enrollments" element={<EnrollmentsPage />} />
            <Route path="/enrollments/:id" element={<EnrollmentDetailPage />} />
            <Route path="/teachers/:id" element={<TeacherDetailPage />} />
            <Route path="/enrollments/new" element={<EnrollmentFormPage mode="create" />} />
            <Route path="/enrollments/:id/edit" element={<EnrollmentFormPage mode="edit" />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/:id" element={<NotificationDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </BrowserRouter>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

function ProtectedLayout({ loading, onLogout, ctx }) {
  const navigate = useNavigate();
  const { token, user, success, refreshWorkspace } = ctx;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { label: 'Главная', to: '/dashboard' },
    { label: 'Пользователи', to: '/users', adminOnly: true },
    { label: 'Курсы', to: '/courses' },
    { label: 'Программы', to: '/programs' },
    { label: 'Лекции', to: '/lessons' },
    { label: 'Тесты', to: '/tests' },
    { label: 'Записи', to: '/enrollments' },
    { label: 'Уведомления', to: '/notifications', adminOnly: true },
  ].filter((item) => !item.adminOnly || user?.role === 'ADMIN');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {loading && <LinearProgress />}
      <AppBar position="sticky" elevation={0} color="inherit" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2, py: 1, flexWrap: 'wrap' }}>
          <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>A</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Контур повторного обучения
            </Typography>
            <Typography variant="body2" color="text.secondary">
              АНО ДПО «Региональный центр охраны труда»
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                variant="text"
                sx={{
                  '&.active': {
                    bgcolor: 'rgba(26,115,232,0.08)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
            {user?.role === 'TEACHER' && (
              <Button variant="outlined" onClick={() => navigate(`/users/${user.id}`)}>
                Профиль
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={async () => {
                const ok = await refreshWorkspace();
                if (ok) {
                  success('Данные обновлены');
                }
              }}
            >
              Обновить
            </Button>
            <Button
              variant="text"
              onClick={() => {
                onLogout();
                navigate('/login', { replace: true });
              }}
            >
              Выйти
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Outlet context={{ ...ctx, navigate }} />
      </Container>
    </Box>
  );
}

function LoginPage({ demoUsers, loginForm, setLoginForm, onLogin, busy }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at top left, rgba(26,115,232,0.12), transparent 30%), radial-gradient(circle at bottom right, rgba(251,188,4,0.12), transparent 28%), #f5f7fb',
        p: 2,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} lg={7}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 5 },
                height: '100%',
                border: 1,
                borderColor: 'divider',
                background: 'linear-gradient(135deg, rgba(26,115,232,0.08), rgba(255,255,255,1))',
              }}
            >
              <Typography variant="overline" color="primary">
                АНО ДПО «Региональный центр охраны труда»
              </Typography>
              <Typography variant="h3" sx={{ mt: 1, mb: 2 }}>
                Разработка информационной системы для ведения клиентской базы и повторного обучения
              </Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 700, lineHeight: 1.8 }}>
                Система показывает курсы, клиентов, преподавателей, сроки повторного обучения и автоматически
                формирует email-уведомления о необходимости пройти обучение повторно.
              </Typography>

              <Grid container spacing={2} sx={{ mt: 3 }}>
                {[
                  ['Администратор', 'Управление пользователями, курсами и рассылкой'],
                  ['Преподаватель', 'Работа с группами и отметка прохождения обучения'],
                  ['Клиент / слушатель', 'Получение уведомлений о повторном обучении'],
                ].map(([title, subtitle]) => (
                  <Grid item xs={12} md={4} key={title}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {subtitle}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Демо-доступы
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {demoUsers.map((item) => (
                  <Chip
                    key={item.email}
                    label={`${item.label}: ${item.email}`}
                    onClick={() => setLoginForm({ email: item.email, password: item.password })}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', height: '100%' }}>
              <Typography variant="h4" gutterBottom>
                Вход в систему
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Используй один из демо-доступов, чтобы открыть панель управления.
              </Typography>
              <Stack
                component="form"
                spacing={2}
                onSubmit={async (event) => {
                  event.preventDefault();
                  try {
                    await onLogin(loginForm);
                    navigate('/dashboard', { replace: true });
                  } catch {
                    // error is already shown via snackbar
                  }
                }}
              >
                <TextField
                  label="Email"
                  fullWidth
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <TextField
                  label="Пароль"
                  type="password"
                  fullWidth
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                />
                <Button type="submit" variant="contained" size="large" disabled={busy}>
                  Войти
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function DashboardPage() {
  const { dashboard, user } = useOutletContext();
  const summary = dashboard?.summary;

  return (
    <Stack spacing={3}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: 1,
          borderColor: 'divider',
          background: 'linear-gradient(135deg, rgba(26,115,232,0.08), rgba(251,188,4,0.08))',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Chip label={user?.role || 'USER'} color="primary" variant="outlined" sx={{ mb: 1 }} />
            <Typography variant="h4" gutterBottom>
              {user?.fullName}
            </Typography>
            <Typography color="text.secondary">{user?.email}</Typography>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="body2" color="text.secondary">
              Рабочая роль
            </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {user?.role === 'ADMIN'
                ? 'Администратор'
                : user?.role === 'METHODIST'
                  ? 'Методист'
                  : user?.role === 'TEACHER'
                    ? 'Преподаватель'
                    : 'Клиент / слушатель'}
              </Typography>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <MetricCard title="Пользователи" value={summary?.totalUsers ?? 0} />
        <MetricCard title="Клиенты" value={summary?.totalClients ?? 0} />
        <MetricCard title="Преподаватели" value={summary?.totalTeachers ?? 0} />
        <MetricCard title="Курсы" value={summary?.totalCourses ?? 0} />
        <MetricCard title="Программы" value={summary?.totalPrograms ?? 0} />
        <MetricCard title="Лекции" value={summary?.totalLessons ?? 0} />
        <MetricCard title="Тесты" value={summary?.totalTests ?? 0} />
        <MetricCard title="Попытки" value={summary?.totalAttempts ?? 0} />
        <MetricCard title="Активные записи" value={summary?.activeEnrollments ?? 0} />
        <MetricCard title="Напоминания" value={summary?.upcomingRepeats ?? 0} />
      </Grid>

      <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <CardContent>
          <SectionTitle title="Сценарий работы" subtitle="Клиентская база, курсы и повторное обучение" />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <InfoCard title="Курсы" text="Список программ с периодом повторного обучения и форматом занятий." />
            <InfoCard title="Программы" text="Структура обучения внутри курса: программы, лекции и тесты." />
            <InfoCard title="Записи" text="Связь клиента, курса и преподавателя с датой следующего обучения." />
            <InfoCard title="Тесты" text="Проверка знаний с ограничением попыток и проходным баллом." />
            <InfoCard title="Уведомления" text="Автоматическая рассылка email-напоминаний о повторном обучении." />
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  );
}

function UsersPage() {
  const { token, user, users, navigate, busy, setBusy, refreshWorkspace, notify } = useOutletContext();
  const isAdmin = user?.role === 'ADMIN';
  const visibleUsers = useMemo(() => (isAdmin ? users : user ? [user] : []), [isAdmin, users, user]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...visibleUsers]
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [item.fullName, item.email, item.phone, item.role]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        const matchesRole = roleFilter === 'ALL' || item.role === roleFilter;
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' ? item.active : !item.active);
        return matchesQuery && matchesRole && matchesStatus;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'email':
            return String(left.email || '').localeCompare(String(right.email || ''), 'ru');
          case 'role':
            return String(left.role || '').localeCompare(String(right.role || ''), 'ru');
          case 'created':
            return compareDates(left.createdAt, right.createdAt);
          case 'login':
            return compareDates(left.lastLoginAt, right.lastLoginAt);
          default:
            return String(left.fullName || '').localeCompare(String(right.fullName || ''), 'ru');
        }
      });
  }, [query, roleFilter, statusFilter, sortBy, visibleUsers]);

  async function handleDelete(id) {
    setBusy(true);
    try {
      await api.deleteUser(token, id);
      await refreshWorkspace();
      notify('Пользователь удалён', 'success');
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <SectionTitle title="Пользователи" subtitle="Управление ролями и доступами" />
          {isAdmin && (
            <Button variant="contained" onClick={() => navigate('/users/new')}>
              Добавить пользователя
            </Button>
          )}
        </Stack>

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          queryLabel="Поиск"
          queryPlaceholder="ФИО, email, телефон"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: 'Сортировка: по ФИО' },
            { value: 'email', label: 'Сортировка: по email' },
            { value: 'role', label: 'Сортировка: по роли' },
            { value: 'created', label: 'Сортировка: по дате создания' },
            { value: 'login', label: 'Сортировка: по последнему входу' },
          ]}
          filters={[
            {
              value: roleFilter,
              onChange: setRoleFilter,
              label: 'Роль',
              options: [
                { value: 'ALL', label: 'Все роли' },
                { value: 'ADMIN', label: 'Администратор' },
                { value: 'METHODIST', label: 'Методист' },
                { value: 'TEACHER', label: 'Преподаватель' },
                { value: 'CLIENT', label: 'Клиент / слушатель' },
              ],
            },
            {
              value: statusFilter,
              onChange: setStatusFilter,
              label: 'Статус',
              options: [
                { value: 'ALL', label: 'Все статусы' },
                { value: 'ACTIVE', label: 'Активные' },
                { value: 'INACTIVE', label: 'Неактивные' },
              ],
            },
          ]}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Найдено: {filteredUsers.length} из {visibleUsers.length}
        </Typography>

        {!isAdmin && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Для преподавателя и клиента доступен только просмотр собственного профиля.
          </Alert>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ФИО</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>MAX</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Создан</TableCell>
                {isAdmin && <TableCell align="right">Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/users/${item.id}`)}
                >
                  <TableCell>{item.fullName}</TableCell>
                  <TableCell>{item.role}</TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.maxContact || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.active ? 'Активен' : 'Неактивен'} color={item.active ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/users/${item.id}`); }}>
                          Открыть
                        </Button>
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/users/${item.id}/edit`); }}>
                          Редактировать
                        </Button>
                        <Button size="small" color="error" onClick={(event) => { event.stopPropagation(); handleDelete(item.id); }} disabled={busy}>
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function UserFormPage({ mode }) {
  const { id } = useParams();
  const { token, user, users, busy, setBusy, refreshWorkspace, notify, navigate } = useOutletContext();
  const isEdit = mode === 'edit';
  const isAdmin = user?.role === 'ADMIN';
  const isOwnTeacher = isEdit && user?.role === 'TEACHER' && String(user.id) === String(id);
  const existing = users.find((item) => String(item.id) === id);
  const [form, setForm] = useState(emptyUserForm);

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        firstName: existing.firstName || '',
        lastName: existing.lastName || '',
        email: existing.email || '',
        phone: existing.phone || '',
        maxContact: existing.maxContact || '',
        password: '',
        role: existing.role || 'CLIENT',
        active: existing.active ?? true,
      });
    }
  }, [isEdit, existing]);

  if (isEdit ? !(isAdmin || isOwnTeacher) : !isAdmin) {
    return <Alert severity="warning">Создание доступно только администратору, а редактирование - администратору или преподавателю своего профиля.</Alert>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        password: form.password || 'change-me-123',
        maxContact: form.role === 'TEACHER' ? form.maxContact : '',
      };
      if (isEdit) {
        if (isAdmin) {
          await api.updateUser(token, id, payload);
        } else {
          await api.updateMe(token, {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            maxContact: form.maxContact,
            password: form.password,
          });
        }
        notify('Пользователь обновлён', 'success');
      } else {
        await api.createUser(token, payload);
        notify('Пользователь создан', 'success');
      }
      await refreshWorkspace();
      navigate('/users', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <SectionTitle title={isEdit ? 'Редактирование пользователя' : 'Новый пользователь'} subtitle="Отдельная страница формы" />
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Фамилия"
                fullWidth
                value={form.lastName}
                onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Имя"
                fullWidth
                value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Телефон"
                fullWidth
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Grid>
            {form.role === 'TEACHER' && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="MAX"
                  fullWidth
                  value={form.maxContact}
                  onChange={(event) => setForm({ ...form, maxContact: event.target.value })}
                  helperText="Контакт преподавателя в MAX"
                  disabled={isEdit && !isAdmin && !isOwnTeacher}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                label={isEdit && !isAdmin ? 'Новый пароль (необязательно)' : isEdit ? 'Новый пароль' : 'Пароль'}
                type="password"
                fullWidth
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                helperText={isEdit && !isAdmin ? 'Оставь пустым, если пароль менять не нужно.' : ''}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Роль"
                fullWidth
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                disabled={isEdit && !isAdmin}
              >
                <MenuItem value="ADMIN">Администратор</MenuItem>
                <MenuItem value="METHODIST">Методист</MenuItem>
                <MenuItem value="TEACHER">Преподаватель</MenuItem>
                <MenuItem value="CLIENT">Клиент / слушатель</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Статус"
                fullWidth
                value={String(form.active)}
                onChange={(event) => setForm({ ...form, active: event.target.value === 'true' })}
                disabled={isEdit && !isAdmin}
              >
                <MenuItem value="true">Активен</MenuItem>
                <MenuItem value="false">Неактивен</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={busy}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/users')}>
              Отмена
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CoursesPage() {
  const { user, dashboard, busy, setBusy, refreshWorkspace, notify, navigate, token } = useOutletContext();
  const courses = useMemo(() => dashboard?.courses || [], [dashboard]);
  const isAdmin = user?.role === 'ADMIN';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('title');

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...courses]
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [item.title, item.description, item.trainingFormat]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' ? item.active : !item.active);
        const matchesFormat = formatFilter === 'ALL' || item.trainingFormat === formatFilter;
        return matchesQuery && matchesStatus && matchesFormat;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'repeat':
            return Number(left.repeatMonths || 0) - Number(right.repeatMonths || 0);
          case 'enrollments':
            return Number(right.enrollmentCount || 0) - Number(left.enrollmentCount || 0);
          case 'active':
            return Number(right.activeEnrollmentCount || 0) - Number(left.activeEnrollmentCount || 0);
          default:
            return String(left.title || '').localeCompare(String(right.title || ''), 'ru');
        }
      });
  }, [courses, query, statusFilter, formatFilter, sortBy]);

  async function handleDelete(id) {
    setBusy(true);
    try {
      await api.deleteCourse(token, id);
      await refreshWorkspace();
      notify('Курс удалён', 'success');
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <SectionTitle title="Курсы" subtitle="Программы и сроки повторного обучения" />
          {isAdmin && (
            <Button variant="contained" onClick={() => navigate('/courses/new')}>
              Добавить курс
            </Button>
          )}
        </Stack>

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          queryLabel="Поиск"
          queryPlaceholder="Название, описание, формат"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'title', label: 'Сортировка: по названию' },
            { value: 'repeat', label: 'Сортировка: по сроку повторения' },
            { value: 'enrollments', label: 'Сортировка: по количеству записей' },
            { value: 'active', label: 'Сортировка: по активным записям' },
          ]}
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              label: 'Статус',
              options: [
                { value: 'ALL', label: 'Все статусы' },
                { value: 'ACTIVE', label: 'Активные' },
                { value: 'INACTIVE', label: 'Неактивные' },
              ],
            },
            {
              value: formatFilter,
              onChange: setFormatFilter,
              label: 'Формат',
              options: [
                { value: 'ALL', label: 'Все форматы' },
                ...Array.from(new Set(courses.map((course) => course.trainingFormat).filter(Boolean))).map((format) => ({
                  value: format,
                  label: format,
                })),
              ],
            },
          ]}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Найдено: {filteredCourses.length} из {courses.length}
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Курс</TableCell>
                <TableCell>Формат</TableCell>
                <TableCell>Повтор</TableCell>
                <TableCell>Программы</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Записей</TableCell>
                {isAdmin && <TableCell align="right">Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCourses.map((course) => (
                <TableRow
                  key={course.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <TableCell>
                    <Typography variant="subtitle2">{course.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{course.description}</Typography>
                  </TableCell>
                  <TableCell>{course.trainingFormat}</TableCell>
                  <TableCell>{course.repeatMonths} мес.</TableCell>
                  <TableCell>{course.programCount}</TableCell>
                  <TableCell>
                    <Chip size="small" label={course.active ? 'Активен' : 'Неактивен'} color={course.active ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>{course.enrollmentCount}</TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/courses/${course.id}`); }}>
                          Открыть
                        </Button>
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/courses/${course.id}/edit`); }}>
                          Редактировать
                        </Button>
                        <Button size="small" color="error" onClick={(event) => { event.stopPropagation(); handleDelete(course.id); }} disabled={busy}>
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function CourseFormPage({ mode }) {
  const { id } = useParams();
  const { user, dashboard, token, busy, setBusy, refreshWorkspace, notify, navigate } = useOutletContext();
  const isAdmin = user?.role === 'ADMIN';
  const isEdit = mode === 'edit';
  const existing = dashboard?.courses?.find((item) => String(item.id) === id);
  const [form, setForm] = useState(emptyCourseForm);

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        title: existing.title || '',
        description: existing.description || '',
        repeatMonths: String(existing.repeatMonths ?? 12),
        trainingFormat: existing.trainingFormat || 'Очный курс',
        active: existing.active ?? true,
      });
    }
  }, [isEdit, existing]);

  if (!isAdmin) {
    return <Alert severity="warning">Создание и редактирование курсов доступно только администратору.</Alert>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, repeatMonths: Number(form.repeatMonths) };
      if (isEdit) {
        await api.updateCourse(token, id, payload);
        notify('Курс обновлён', 'success');
      } else {
        await api.createCourse(token, payload);
        notify('Курс создан', 'success');
      }
      await refreshWorkspace();
      navigate('/courses', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <SectionTitle title={isEdit ? 'Редактирование курса' : 'Новый курс'} subtitle="Отдельная страница формы" />
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Название"
                fullWidth
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Формат"
                fullWidth
                value={form.trainingFormat}
                onChange={(event) => setForm({ ...form, trainingFormat: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Период повторения (мес.)"
                type="number"
                fullWidth
                value={form.repeatMonths}
                onChange={(event) => setForm({ ...form, repeatMonths: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Описание"
                fullWidth
                multiline
                minRows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Статус"
                fullWidth
                value={String(form.active)}
                onChange={(event) => setForm({ ...form, active: event.target.value === 'true' })}
              >
                <MenuItem value="true">Активен</MenuItem>
                <MenuItem value="false">Неактивен</MenuItem>
              </TextField>
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={busy}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/courses')}>
              Отмена
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProgramsPage() {
  const { user, dashboard, token, navigate, busy, setBusy, refreshWorkspace, notify } = useOutletContext();
  const programs = useMemo(() => dashboard?.programs || [], [dashboard]);
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('position');

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...programs]
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [item.title, item.description, item.course?.title]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        const matchesCourse = courseFilter === 'ALL' || String(item.course?.id) === courseFilter;
        const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? item.active : !item.active);
        return matchesQuery && matchesCourse && matchesStatus;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'course':
            return String(left.course?.title || '').localeCompare(String(right.course?.title || ''), 'ru');
          case 'lessons':
            return Number(right.lessonCount || 0) - Number(left.lessonCount || 0);
          case 'tests':
            return Number(right.testCount || 0) - Number(left.testCount || 0);
          default:
            return Number(left.position || 0) - Number(right.position || 0);
        }
      });
  }, [programs, query, courseFilter, statusFilter, sortBy]);

  async function handleDelete(id) {
    setBusy(true);
    try {
      await api.deleteProgram(token, id);
      await refreshWorkspace();
      notify('Программа удалена', 'success');
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <SectionTitle title="Программы" subtitle="Структура обучения внутри курса" />
          {isManager && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/programs/new')}>
              Добавить программу
            </Button>
          )}
        </Stack>

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          queryLabel="Поиск"
          queryPlaceholder="Название, описание, курс"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'position', label: 'Сортировка: по позиции' },
            { value: 'course', label: 'Сортировка: по курсу' },
            { value: 'lessons', label: 'Сортировка: по числу лекций' },
            { value: 'tests', label: 'Сортировка: по числу тестов' },
          ]}
          filters={[
            {
              value: courseFilter,
              onChange: setCourseFilter,
              label: 'Курс',
              options: [
                { value: 'ALL', label: 'Все курсы' },
                ...(dashboard?.courses || []).map((course) => ({ value: String(course.id), label: course.title })),
              ],
            },
            {
              value: statusFilter,
              onChange: setStatusFilter,
              label: 'Статус',
              options: [
                { value: 'ALL', label: 'Все статусы' },
                { value: 'ACTIVE', label: 'Активные' },
                { value: 'INACTIVE', label: 'Неактивные' },
              ],
            },
          ]}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Найдено: {filteredPrograms.length} из {programs.length}
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Программа</TableCell>
                <TableCell>Курс</TableCell>
                <TableCell>Позиция</TableCell>
                <TableCell>Лекции</TableCell>
                <TableCell>Тесты</TableCell>
                <TableCell>Статус</TableCell>
                {isManager && <TableCell align="right">Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPrograms.map((item) => (
                <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/programs/${item.id}`)}>
                  <TableCell>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.description}</Typography>
                  </TableCell>
                  <TableCell>{item.course?.title}</TableCell>
                  <TableCell>{item.position}</TableCell>
                  <TableCell>{item.lessonCount}</TableCell>
                  <TableCell>{item.testCount}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.active ? 'Активна' : 'Неактивна'} color={item.active ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  {isManager && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/programs/${item.id}`); }}>
                          Открыть
                        </Button>
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/programs/${item.id}/edit`); }}>
                          Редактировать
                        </Button>
                        <Button size="small" color="error" onClick={(event) => { event.stopPropagation(); handleDelete(item.id); }} disabled={busy}>
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function ProgramDetailPage() {
  const { id } = useParams();
  const { dashboard, navigate, user } = useOutletContext();
  const selectedProgram = dashboard?.programs?.find((item) => String(item.id) === id);
  const relatedLessons = (dashboard?.lessons || []).filter((item) => String(item.program?.id) === String(id));
  const relatedTests = (dashboard?.tests || []).filter((item) => String(item.program?.id) === String(id));
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';

  if (!selectedProgram) {
    return <Alert severity="error">Программа не найдена.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={selectedProgram.title}
        subtitle="Подробная карточка программы"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/programs')}>
              Назад к списку
            </Button>
            {isManager && (
              <Button variant="contained" onClick={() => navigate(`/programs/${selectedProgram.id}/edit`)}>
                Редактировать
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Данные программы" subtitle="Все доступные сведения">
        <Grid container spacing={2}>
          <DetailField label="ID" value={selectedProgram.id} />
          <DetailField label="Курс" value={selectedProgram.course?.title} />
          <DetailField label="Позиция" value={selectedProgram.position} />
          <DetailField label="Статус" value={<Chip size="small" label={selectedProgram.active ? 'Активна' : 'Неактивна'} color={selectedProgram.active ? 'success' : 'default'} variant="outlined" />} />
          <DetailField label="Лекций" value={selectedProgram.lessonCount} />
          <DetailField label="Тестов" value={selectedProgram.testCount} />
          <DetailField label="Описание" value={selectedProgram.description || 'Не указано'} />
        </Grid>
      </DetailSection>

      <DetailSection title="Лекции" subtitle="Страницы программы">
        <Stack spacing={2}>
          {relatedLessons.length === 0 ? (
            <Alert severity="info">Лекций пока нет.</Alert>
          ) : (
            relatedLessons.map((lesson) => (
              <Paper key={lesson.id} variant="outlined" sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => navigate(`/lessons/${lesson.id}`)}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{lesson.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{lesson.body}</Typography>
                  </Box>
                  <Chip size="small" label={`Позиция ${lesson.position}`} variant="outlined" />
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>

      <DetailSection title="Тесты" subtitle="Проверка знаний в рамках программы">
        <Stack spacing={2}>
          {relatedTests.length === 0 ? (
            <Alert severity="info">Тестов пока нет.</Alert>
          ) : (
            relatedTests.map((test) => (
              <Paper key={test.id} variant="outlined" sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => navigate(`/tests/${test.id}`)}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{test.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Проходной балл: {test.passScore} · Попыток: {test.attemptCount}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                    <StatusChip test={test} />
                    <Chip size="small" label={`Лучший результат: ${test.bestScore}`} variant="outlined" />
                  </Stack>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>
    </Stack>
  );
}

function ProgramFormPage({ mode }) {
  const { id } = useParams();
  const { dashboard, token, busy, setBusy, refreshWorkspace, notify, navigate, user } = useOutletContext();
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';
  const isEdit = mode === 'edit';
  const existing = dashboard?.programs?.find((item) => String(item.id) === id);
  const [form, setForm] = useState(emptyProgramForm);

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        courseId: String(existing.course?.id || ''),
        title: existing.title || '',
        description: existing.description || '',
        position: existing.position || 1,
        active: existing.active ?? true,
      });
    }
  }, [isEdit, existing]);

  if (!isManager) {
    return <Alert severity="warning">Создание и редактирование программ доступно только администратору и методисту.</Alert>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        courseId: Number(form.courseId),
        title: form.title,
        description: form.description,
        position: Number(form.position),
        active: form.active === true || form.active === 'true',
      };
      if (isEdit) {
        await api.updateProgram(token, id, payload);
        notify('Программа обновлена', 'success');
      } else {
        await api.createProgram(token, payload);
        notify('Программа создана', 'success');
      }
      await refreshWorkspace();
      navigate('/programs', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <SectionTitle title={isEdit ? 'Редактирование программы' : 'Новая программа'} subtitle="Отдельная страница формы" />
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Курс"
                fullWidth
                value={form.courseId}
                onChange={(event) => setForm({ ...form, courseId: event.target.value })}
              >
                <MenuItem value="">Выберите курс</MenuItem>
                {(dashboard?.courses || []).map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Позиция"
                type="number"
                fullWidth
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Название"
                fullWidth
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Статус"
                fullWidth
                value={String(form.active)}
                onChange={(event) => setForm({ ...form, active: event.target.value === 'true' })}
              >
                <MenuItem value="true">Активна</MenuItem>
                <MenuItem value="false">Неактивна</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Описание"
                fullWidth
                multiline
                minRows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={busy}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/programs')}>
              Отмена
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function LessonsPage() {
  const { user, dashboard, token, navigate, busy, setBusy, refreshWorkspace, notify } = useOutletContext();
  const lessons = useMemo(() => dashboard?.lessons || [], [dashboard]);
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';
  const [query, setQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('position');

  const filteredLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...lessons]
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [item.title, item.body, item.program?.title]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        const matchesProgram = programFilter === 'ALL' || String(item.program?.id) === programFilter;
        const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? item.active : !item.active);
        return matchesQuery && matchesProgram && matchesStatus;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'program':
            return String(left.program?.title || '').localeCompare(String(right.program?.title || ''), 'ru');
          default:
            return Number(left.position || 0) - Number(right.position || 0);
        }
      });
  }, [lessons, query, programFilter, statusFilter, sortBy]);

  async function handleDelete(id) {
    setBusy(true);
    try {
      await api.deleteLesson(token, id);
      await refreshWorkspace();
      notify('Лекция удалена', 'success');
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <SectionTitle title="Лекции" subtitle="Текстовые материалы внутри программ" />
          {isManager && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/lessons/new')}>
              Добавить лекцию
            </Button>
          )}
        </Stack>

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          queryLabel="Поиск"
          queryPlaceholder="Название, текст, программа"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'position', label: 'Сортировка: по позиции' },
            { value: 'program', label: 'Сортировка: по программе' },
          ]}
          filters={[
            {
              value: programFilter,
              onChange: setProgramFilter,
              label: 'Программа',
              options: [
                { value: 'ALL', label: 'Все программы' },
                ...(dashboard?.programs || []).map((program) => ({ value: String(program.id), label: program.title })),
              ],
            },
            {
              value: statusFilter,
              onChange: setStatusFilter,
              label: 'Статус',
              options: [
                { value: 'ALL', label: 'Все статусы' },
                { value: 'ACTIVE', label: 'Активные' },
                { value: 'INACTIVE', label: 'Неактивные' },
              ],
            },
          ]}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Найдено: {filteredLessons.length} из {lessons.length}
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Лекция</TableCell>
                <TableCell>Программа</TableCell>
                <TableCell>Позиция</TableCell>
                <TableCell>Тест</TableCell>
                <TableCell>Статус</TableCell>
                {isManager && <TableCell align="right">Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLessons.map((item) => (
                <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/lessons/${item.id}`)}>
                  <TableCell>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.body}</Typography>
                  </TableCell>
                  <TableCell>{item.program?.title}</TableCell>
                  <TableCell>{item.position}</TableCell>
                  <TableCell>{item.testCount}</TableCell>
                  <TableCell>
                    <Chip size="small" label={item.active ? 'Активна' : 'Неактивна'} color={item.active ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  {isManager && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/lessons/${item.id}`); }}>
                          Открыть
                        </Button>
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/lessons/${item.id}/edit`); }}>
                          Редактировать
                        </Button>
                        <Button size="small" color="error" onClick={(event) => { event.stopPropagation(); handleDelete(item.id); }} disabled={busy}>
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function LessonDetailPage() {
  const { id } = useParams();
  const { dashboard, navigate, user } = useOutletContext();
  const selectedLesson = dashboard?.lessons?.find((item) => String(item.id) === id);
  const relatedTest = (dashboard?.tests || []).find((item) => String(item.lesson?.id) === String(id));
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';

  if (!selectedLesson) {
    return <Alert severity="error">Лекция не найдена.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={selectedLesson.title}
        subtitle="Подробная карточка лекции"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/lessons')}>
              Назад к списку
            </Button>
            {isManager && (
              <Button variant="contained" onClick={() => navigate(`/lessons/${selectedLesson.id}/edit`)}>
                Редактировать
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Текст лекции" subtitle="Все доступные данные">
        <Grid container spacing={2}>
          <DetailField label="ID" value={selectedLesson.id} />
          <DetailField label="Программа" value={selectedLesson.program?.title} />
          <DetailField label="Позиция" value={selectedLesson.position} />
          <DetailField label="Статус" value={<Chip size="small" label={selectedLesson.active ? 'Активна' : 'Неактивна'} color={selectedLesson.active ? 'success' : 'default'} variant="outlined" />} />
          <Grid item xs={12}>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Содержание</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{selectedLesson.body || 'Текст не указан'}</Typography>
            </Box>
          </Grid>
        </Grid>
      </DetailSection>

      <DetailSection title="Связанный тест" subtitle="Контроль знаний по лекции">
        {relatedTest ? (
          <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => navigate(`/tests/${relatedTest.id}`)}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{relatedTest.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Проходной балл: {relatedTest.passScore} · Попыток: {relatedTest.attemptCount}
                </Typography>
              </Box>
              <Button variant="outlined" onClick={(event) => { event.stopPropagation(); navigate(`/tests/${relatedTest.id}`); }}>
                Открыть тест
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Alert severity="info">К этой лекции пока не привязан тест.</Alert>
        )}
      </DetailSection>
    </Stack>
  );
}

function LessonFormPage({ mode }) {
  const { id } = useParams();
  const { dashboard, token, busy, setBusy, refreshWorkspace, notify, navigate, user } = useOutletContext();
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';
  const isEdit = mode === 'edit';
  const existing = dashboard?.lessons?.find((item) => String(item.id) === id);
  const [form, setForm] = useState(emptyLessonForm);

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        programId: String(existing.program?.id || ''),
        title: existing.title || '',
        body: existing.body || '',
        position: existing.position || 1,
        active: existing.active ?? true,
      });
    }
  }, [isEdit, existing]);

  if (!isManager) {
    return <Alert severity="warning">Создание и редактирование лекций доступно только администратору и методисту.</Alert>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        programId: Number(form.programId),
        title: form.title,
        body: form.body,
        position: Number(form.position),
        active: form.active === true || form.active === 'true',
      };
      if (isEdit) {
        await api.updateLesson(token, id, payload);
        notify('Лекция обновлена', 'success');
      } else {
        await api.createLesson(token, payload);
        notify('Лекция создана', 'success');
      }
      await refreshWorkspace();
      navigate('/lessons', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <SectionTitle title={isEdit ? 'Редактирование лекции' : 'Новая лекция'} subtitle="Отдельная страница формы" />
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Программа"
                fullWidth
                value={form.programId}
                onChange={(event) => setForm({ ...form, programId: event.target.value })}
              >
                <MenuItem value="">Выберите программу</MenuItem>
                {(dashboard?.programs || []).map((program) => (
                  <MenuItem key={program.id} value={program.id}>
                    {program.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Позиция"
                type="number"
                fullWidth
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Название"
                fullWidth
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Статус"
                fullWidth
                value={String(form.active)}
                onChange={(event) => setForm({ ...form, active: event.target.value === 'true' })}
              >
                <MenuItem value="true">Активна</MenuItem>
                <MenuItem value="false">Неактивна</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Текст лекции"
                fullWidth
                multiline
                minRows={8}
                value={form.body}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={busy}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/lessons')}>
              Отмена
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function TestsPage() {
  const { user, dashboard, token, navigate, busy, setBusy, refreshWorkspace, notify } = useOutletContext();
  const tests = useMemo(() => dashboard?.tests || [], [dashboard]);
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';
  const isClient = user?.role === 'CLIENT';
  const [query, setQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('best');

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...tests]
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [item.title, item.program?.title, item.lesson?.title]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        const matchesProgram = programFilter === 'ALL' || String(item.program?.id) === programFilter;
        const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? item.active : !item.active);
        return matchesQuery && matchesProgram && matchesStatus;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'program':
            return String(left.program?.title || '').localeCompare(String(right.program?.title || ''), 'ru');
          case 'score':
            return Number(right.passScore || 0) - Number(left.passScore || 0);
          case 'questions':
            return Number(right.questionCount || 0) - Number(left.questionCount || 0);
          default:
            return Number(right.bestScore || 0) - Number(left.bestScore || 0);
        }
      });
  }, [tests, query, programFilter, statusFilter, sortBy]);

  async function handleDelete(id) {
    setBusy(true);
    try {
      await api.deleteTest(token, id);
      await refreshWorkspace();
      notify('Тест удалён', 'success');
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <SectionTitle title="Тесты" subtitle="Контроль знаний и попытки прохождения" />
          {isManager && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tests/new')}>
              Добавить тест
            </Button>
          )}
        </Stack>

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          queryLabel="Поиск"
          queryPlaceholder="Название, программа, лекция"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'best', label: 'Сортировка: по лучшему результату' },
            { value: 'program', label: 'Сортировка: по программе' },
            { value: 'score', label: 'Сортировка: по проходному баллу' },
            { value: 'questions', label: 'Сортировка: по числу вопросов' },
          ]}
          filters={[
            {
              value: programFilter,
              onChange: setProgramFilter,
              label: 'Программа',
              options: [
                { value: 'ALL', label: 'Все программы' },
                ...(dashboard?.programs || []).map((program) => ({ value: String(program.id), label: program.title })),
              ],
            },
            {
              value: statusFilter,
              onChange: setStatusFilter,
              label: 'Статус',
              options: [
                { value: 'ALL', label: 'Все статусы' },
                { value: 'ACTIVE', label: 'Активные' },
                { value: 'INACTIVE', label: 'Неактивные' },
              ],
            },
          ]}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Найдено: {filteredTests.length} из {tests.length}
        </Typography>

        <DetailSection title="Успешно пройденные" subtitle="Тесты, которые уже сданы">
          <Stack spacing={2}>
            {filteredTests.filter((item) => item.bestPassed).length === 0 ? (
              <Alert severity="info">Пока нет успешно пройденных тестов.</Alert>
            ) : (
              filteredTests
                .filter((item) => item.bestPassed)
                .map((item) => (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{ p: 2, cursor: 'pointer', borderColor: 'success.main', bgcolor: 'success.lightest', '&:hover': { borderColor: 'success.dark' } }}
                    onClick={() => navigate(`/tests/${item.id}`)}
                  >
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.program?.title} · {item.lesson?.title}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                        <StatusChip test={item} />
                        <Chip size="small" label={`Лучший результат: ${item.bestScore}`} color="success" variant="outlined" />
                      </Stack>
                    </Stack>
                  </Paper>
                ))
            )}
          </Stack>
        </DetailSection>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Тест</TableCell>
                <TableCell>Программа</TableCell>
                <TableCell>Лекция</TableCell>
                <TableCell>Вопросы</TableCell>
                <TableCell>Попытки</TableCell>
                <TableCell>Проходной балл</TableCell>
                <TableCell>Статус</TableCell>
                {isManager && <TableCell align="right">Действия</TableCell>}
                {!isManager && isClient && <TableCell align="right">Действия</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTests.map((item) => (
                <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/tests/${item.id}`)}>
                  <TableCell>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Лучший результат: {item.bestScore} {item.bestPassed ? '(пройден)' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.program?.title}</TableCell>
                  <TableCell>{item.lesson?.title}</TableCell>
                  <TableCell>{item.questionCount}</TableCell>
                  <TableCell>{item.attemptCount}</TableCell>
                  <TableCell>{item.passScore}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Chip size="small" label={item.active ? 'Активен' : 'Неактивен'} color={item.active ? 'success' : 'default'} variant="outlined" />
                      <StatusChip test={item} />
                    </Stack>
                  </TableCell>
                  {isManager && (
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/tests/${item.id}`); }}>
                          Открыть
                        </Button>
                        <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/tests/${item.id}/edit`); }}>
                          Редактировать
                        </Button>
                        <Button size="small" color="error" onClick={(event) => { event.stopPropagation(); handleDelete(item.id); }} disabled={busy}>
                          Удалить
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                  {!isManager && isClient && (
                    <TableCell align="right">
                      <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/tests/${item.id}`); }}>
                        Пройти
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function TestDetailPage() {
  const { id } = useParams();
  const { token, dashboard, navigate, user } = useOutletContext();
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingDetail(true);
    api.test(token, id)
      .then((response) => {
        if (active) {
          setDetail(response);
        }
      })
      .catch(() => {
        if (active) {
          setDetail(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDetail(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  const fallback = dashboard?.tests?.find((item) => String(item.id) === id);
  const test = detail?.test || fallback;
  const questions = detail?.questions || [];
  const attempts = detail?.attempts || [];
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';
  const canTake = user?.role === 'CLIENT' && test?.active && attempts.length < (test?.maxAttempts ?? 0);

  if (!test) {
    return <Alert severity="error">{loadingDetail ? 'Загрузка теста...' : 'Тест не найден'}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={test.title}
        subtitle="Подробная карточка теста"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/tests')}>
              Назад к списку
            </Button>
            {isManager && (
              <Button variant="contained" onClick={() => navigate(`/tests/${test.id}/edit`)}>
                Редактировать
              </Button>
            )}
            {canTake && (
              <Button variant="contained" color="secondary" onClick={() => navigate(`/tests/${test.id}/take`)}>
                Пройти тест
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Параметры теста" subtitle="Проходной балл, попытки и привязка">
        <Grid container spacing={2}>
          <DetailField label="ID" value={test.id} />
          <DetailField label="Программа" value={test.program?.title} />
          <DetailField label="Лекция" value={test.lesson?.title} />
          <DetailField label="Проходной балл" value={test.passScore} />
          <DetailField label="Макс. попыток" value={test.maxAttempts} />
          <DetailField label="Вопросов" value={test.questionCount} />
          <DetailField label="Попыток" value={test.attemptCount} />
          <DetailField label="Лучший результат" value={test.bestScore} />
          <DetailField
            label="Статус"
            value={
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={test.active ? 'Активен' : 'Неактивен'} color={test.active ? 'success' : 'default'} variant="outlined" />
                <StatusChip test={test} />
              </Stack>
            }
          />
        </Grid>
      </DetailSection>

      <DetailSection title="Вопросы" subtitle="Список вопросов и вариантов ответа">
        <Stack spacing={2}>
          {questions.length === 0 ? (
            <Alert severity="info">В тесте пока нет вопросов.</Alert>
          ) : (
            questions.map((question) => (
              <Paper key={question.id} variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ fontWeight: 700 }}>{question.position}. {question.questionText}</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {question.options.map((option) => (
                    <Chip
                      key={option.id}
                      label={option.text}
                      color={option.correct ? 'success' : 'default'}
                      variant={option.correct ? 'filled' : 'outlined'}
                      sx={{ width: 'fit-content' }}
                    />
                  ))}
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>

      <DetailSection title="Попытки" subtitle="История прохождения теста">
        <Stack spacing={2}>
          {attempts.length === 0 ? (
            <Alert severity="info">Попыток пока нет.</Alert>
          ) : (
            attempts.map((attempt) => (
              <Paper key={attempt.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      Попытка #{attempt.attemptNo} · {attempt.client?.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Результат: {attempt.score} из {attempt.maxScore} · {attempt.passed ? 'Пройден' : 'Не пройден'}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary">{formatDateTime(attempt.takenAt)}</Typography>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>
    </Stack>
  );
}

function TestTakePage() {
  const { id } = useParams();
  const { token, navigate, notify, refreshWorkspace } = useOutletContext();
  const [detail, setDetail] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    api.test(token, id)
      .then((response) => {
        if (active) {
          setDetail(response);
          setAnswers({});
        }
      })
      .catch((error) => {
        if (active) {
          notify(error);
          navigate('/tests', { replace: true });
        }
      });
    return () => {
      active = false;
    };
  }, [id, token, navigate, notify]);

  const test = detail?.test;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers)
          .filter(([, optionId]) => optionId)
          .map(([questionId, optionId]) => ({ questionId: Number(questionId), optionId: Number(optionId) })),
      };
      const response = await api.submitTestAttempt(token, id, payload);
      setResult(response);
      await refreshWorkspace();
      notify(`Результат: ${response.score} из ${response.maxScore}`, response.passed ? 'success' : 'error');
    } catch (error) {
      notify(error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!test) {
    return <Alert severity="info">Загрузка теста...</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={`Прохождение теста: ${test.title}`}
        subtitle="Выбирай ответы и отправляй результат"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate(`/tests/${test.id}`)}>
              Назад к тесту
            </Button>
          </Stack>
        }
      />

      {result && (
        <Alert severity={result.passed ? 'success' : 'warning'}>
          Попытка #{result.attemptNo} сохранена. Результат: {result.score} из {result.maxScore}. {result.passed ? 'Тест пройден.' : 'Тест не пройден.'}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
        <Stack component="form" spacing={2} onSubmit={handleSubmit}>
          {detail.questions.map((question) => (
            <Paper key={question.id} variant="outlined" sx={{ p: 2 }}>
              <FormControl fullWidth>
                <FormLabel sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                  {question.position}. {question.questionText}
                </FormLabel>
                <RadioGroup
                  value={answers[question.id] || ''}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                >
                  {question.options.map((option) => (
                    <FormControlLabel
                      key={option.id}
                      value={String(option.id)}
                      control={<Radio />}
                      label={option.text}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Paper>
          ))}

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={submitting}>
              Отправить
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/tests/${test.id}`)}>
              Отмена
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}

function TestFormPage({ mode }) {
  const { id } = useParams();
  const { dashboard, token, busy, setBusy, refreshWorkspace, notify, navigate, user } = useOutletContext();
  const isManager = user?.role === 'ADMIN' || user?.role === 'METHODIST';
  const isEdit = mode === 'edit';
  const existing = dashboard?.tests?.find((item) => String(item.id) === id);
  const [form, setForm] = useState(emptyTestForm);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isEdit || !existing) {
        return;
      }
      try {
        const detail = await api.test(token, id);
        if (!active) {
          return;
        }
        setForm({
          programId: String(detail.test.program?.id || ''),
          lessonId: String(detail.test.lesson?.id || ''),
          title: detail.test.title || '',
          passScore: detail.test.passScore || 1,
          maxAttempts: detail.test.maxAttempts || 1,
          active: detail.test.active ?? true,
          questions: detail.questions.map((question) => ({
            questionText: question.questionText,
            position: question.position,
            options: question.options.map((option) => ({
              text: option.text,
              correct: option.correct,
              position: option.position,
            })),
          })),
        });
      } catch (error) {
        notify(error);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [isEdit, existing, id, token, notify]);

  if (!isManager) {
    return <Alert severity="warning">Создание и редактирование тестов доступно только администратору и методисту.</Alert>;
  }

  function addQuestion() {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...(prev.questions || []),
        {
          questionText: '',
          position: (prev.questions || []).length + 1,
          options: [
            { text: '', correct: true, position: 1 },
            { text: '', correct: false, position: 2 },
          ],
        },
      ],
    }));
  }

  function updateQuestion(questionIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) => (index === questionIndex ? { ...question, [field]: value } : question)),
    }));
  }

  function removeQuestion(questionIndex) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== questionIndex),
    }));
  }

  function addOption(questionIndex) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: [
                ...question.options,
                { text: '', correct: false, position: question.options.length + 1 },
              ],
            }
          : question
      ),
    }));
  }

  function updateOption(questionIndex, optionIndex, field, value) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              options: question.options.map((option, optIndex) =>
                optIndex === optionIndex ? { ...option, [field]: value } : option
              ),
            }
          : question
      ),
    }));
  }

  function removeOption(questionIndex, optionIndex) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, index) =>
        index === questionIndex
          ? { ...question, options: question.options.filter((_, optIndex) => optIndex !== optionIndex) }
          : question
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        programId: Number(form.programId),
        lessonId: Number(form.lessonId),
        title: form.title,
        passScore: Number(form.passScore),
        maxAttempts: Number(form.maxAttempts),
        active: form.active === true || form.active === 'true',
        questions: form.questions.map((question, index) => ({
          questionText: question.questionText,
          position: Number(question.position || index + 1),
          options: question.options.map((option, optIndex) => ({
            text: option.text,
            correct: option.correct === true || option.correct === 'true',
            position: Number(option.position || optIndex + 1),
          })),
        })),
      };
      if (isEdit) {
        await api.updateTest(token, id, payload);
        notify('Тест обновлён', 'success');
      } else {
        await api.createTest(token, payload);
        notify('Тест создан', 'success');
      }
      await refreshWorkspace();
      navigate('/tests', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <SectionTitle title={isEdit ? 'Редактирование теста' : 'Новый тест'} subtitle="Форма с вопросами и вариантами ответа" />
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Программа"
                fullWidth
                value={form.programId}
                onChange={(event) => {
                  const programId = event.target.value;
                  const firstLesson = (dashboard?.lessons || []).find((lesson) => String(lesson.program?.id) === String(programId));
                  setForm((prev) => ({ ...prev, programId, lessonId: firstLesson ? String(firstLesson.id) : '' }));
                }}
              >
                <MenuItem value="">Выберите программу</MenuItem>
                {(dashboard?.programs || []).map((program) => (
                  <MenuItem key={program.id} value={program.id}>
                    {program.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Лекция"
                fullWidth
                value={form.lessonId}
                onChange={(event) => setForm({ ...form, lessonId: event.target.value })}
              >
                <MenuItem value="">Выберите лекцию</MenuItem>
                {(dashboard?.lessons || [])
                  .filter((lesson) => !form.programId || String(lesson.program?.id) === String(form.programId))
                  .map((lesson) => (
                    <MenuItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Название"
                fullWidth
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Проходной балл"
                type="number"
                fullWidth
                value={form.passScore}
                onChange={(event) => setForm({ ...form, passScore: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Попыток"
                type="number"
                fullWidth
                value={form.maxAttempts}
                onChange={(event) => setForm({ ...form, maxAttempts: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Статус"
                fullWidth
                value={String(form.active)}
                onChange={(event) => setForm({ ...form, active: event.target.value === 'true' })}
              >
                <MenuItem value="true">Активен</MenuItem>
                <MenuItem value="false">Неактивен</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Вопросы</Typography>
              <Button startIcon={<AddIcon />} variant="outlined" onClick={addQuestion}>
                Добавить вопрос
              </Button>
            </Stack>

            <Stack spacing={2}>
              {form.questions.map((question, questionIndex) => (
                <Paper key={questionIndex} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                      <Typography sx={{ fontWeight: 700 }}>Вопрос #{questionIndex + 1}</Typography>
                      <Button color="error" startIcon={<DeleteIcon />} onClick={() => removeQuestion(questionIndex)}>
                        Удалить вопрос
                      </Button>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        <TextField
                          label="Текст вопроса"
                          fullWidth
                          value={question.questionText}
                          onChange={(event) => updateQuestion(questionIndex, 'questionText', event.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          label="Позиция"
                          type="number"
                          fullWidth
                          value={question.position}
                          onChange={(event) => updateQuestion(questionIndex, 'position', event.target.value)}
                        />
                      </Grid>
                    </Grid>

                    <Stack spacing={1.5}>
                      {question.options.map((option, optionIndex) => (
                        <Grid container spacing={1} key={optionIndex} alignItems="center">
                          <Grid item xs={12} md={5}>
                            <TextField
                              label={`Вариант ${optionIndex + 1}`}
                              fullWidth
                              value={option.text}
                              onChange={(event) => updateOption(questionIndex, optionIndex, 'text', event.target.value)}
                            />
                          </Grid>
                          <Grid item xs={6} md={2}>
                            <TextField
                              label="Позиция"
                              type="number"
                              fullWidth
                              value={option.position}
                              onChange={(event) => updateOption(questionIndex, optionIndex, 'position', event.target.value)}
                            />
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <TextField
                              select
                              label="Правильный"
                              fullWidth
                              value={String(option.correct)}
                              onChange={(event) => updateOption(questionIndex, optionIndex, 'correct', event.target.value === 'true')}
                            >
                              <MenuItem value="true">Да</MenuItem>
                              <MenuItem value="false">Нет</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={2}>
                            <Button color="error" onClick={() => removeOption(questionIndex, optionIndex)}>
                              Удалить
                            </Button>
                          </Grid>
                        </Grid>
                      ))}
                      <Button startIcon={<AddIcon />} variant="text" onClick={() => addOption(questionIndex)}>
                        Добавить вариант
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={busy}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/tests')}>
              Отмена
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EnrollmentsPage() {
  const { user, dashboard, navigate, busy, setBusy, notify, refreshWorkspace, token } = useOutletContext();
  const enrollments = useMemo(() => dashboard?.enrollments || [], [dashboard]);
  const canEdit = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('due');

  const filteredEnrollments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...enrollments]
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            item.client?.fullName,
            item.client?.email,
            item.course?.title,
            item.teacher?.fullName,
            item.notes,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'client':
            return String(left.client?.fullName || '').localeCompare(String(right.client?.fullName || ''), 'ru');
          case 'course':
            return String(left.course?.title || '').localeCompare(String(right.course?.title || ''), 'ru');
          case 'status':
            return String(left.status || '').localeCompare(String(right.status || ''), 'ru');
          case 'enrolled':
            return compareDates(left.enrolledAt, right.enrolledAt);
          default:
            return compareDates(left.nextDueAt, right.nextDueAt);
        }
      });
  }, [enrollments, query, statusFilter, sortBy]);

  async function handleComplete(id) {
    setBusy(true);
    try {
      await api.completeEnrollment(token, id, { notes: 'Отмечено через список записей.' });
      await refreshWorkspace();
      notify('Прохождение отмечено', 'success');
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <SectionTitle title="Записи" subtitle="Клиенты, преподаватели и сроки повторного обучения" />
          {user?.role === 'ADMIN' && (
            <Button variant="contained" onClick={() => navigate('/enrollments/new')}>
              Добавить запись
            </Button>
          )}
        </Stack>

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          queryLabel="Поиск"
          queryPlaceholder="Клиент, курс, преподаватель, комментарий"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'due', label: 'Сортировка: по следующей дате' },
            { value: 'enrolled', label: 'Сортировка: по дате записи' },
            { value: 'client', label: 'Сортировка: по клиенту' },
            { value: 'course', label: 'Сортировка: по курсу' },
            { value: 'status', label: 'Сортировка: по статусу' },
          ]}
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              label: 'Статус',
              options: [
                { value: 'ALL', label: 'Все статусы' },
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'COMPLETED', label: 'COMPLETED' },
                { value: 'CANCELLED', label: 'CANCELLED' },
              ],
            },
          ]}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Найдено: {filteredEnrollments.length} из {enrollments.length}
        </Typography>

        <Stack spacing={2}>
          {filteredEnrollments.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{ p: 2, cursor: 'pointer', transition: 'transform .15s ease', '&:hover': { transform: 'translateY(-1px)' } }}
              onClick={() => navigate(`/enrollments/${item.id}`)}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {item.client?.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.course?.title}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={item.status}
                    color={item.status === 'ACTIVE' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">Преподаватель</Typography>
                    <Typography>{item.teacher?.fullName || 'Не назначен'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">Следующее обучение</Typography>
                    <Typography>{formatDate(item.nextDueAt)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">Комментарий</Typography>
                    <Typography>{item.notes || 'Нет'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary">Группа в MAX</Typography>
                    <Typography>{item.groupName || 'Не указана'}</Typography>
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {canEdit && (
                    <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/enrollments/${item.id}`); }}>
                      Открыть
                    </Button>
                  )}
                  {canEdit && (
                    <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/enrollments/${item.id}/edit`); }}>
                      Редактировать
                    </Button>
                  )}
                  {canEdit && item.status !== 'COMPLETED' && (
                    <Button size="small" variant="outlined" onClick={(event) => { event.stopPropagation(); handleComplete(item.id); }} disabled={busy}>
                      Отметить завершение
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function EnrollmentFormPage({ mode }) {
  const { id } = useParams();
  const { user, dashboard, users, token, busy, setBusy, refreshWorkspace, notify, navigate } = useOutletContext();
  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isEdit = mode === 'edit';
  const existing = dashboard?.enrollments?.find((item) => String(item.id) === id);
  const [form, setForm] = useState(emptyEnrollmentForm);

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        clientId: String(existing.client?.id || ''),
        courseId: String(existing.course?.id || ''),
        teacherId: String(existing.teacher?.id || ''),
        groupName: existing.groupName || '',
        notes: existing.notes || '',
      });
    }
  }, [isEdit, existing]);

  if (!isAdmin && !isTeacher) {
    return <Alert severity="warning">Работа с записями доступна только администратору и преподавателю.</Alert>;
  }

  const clients = users.filter((item) => item.role === 'CLIENT');
  const teachers = users.filter((item) => item.role === 'TEACHER');
  const courses = dashboard?.courses || [];

  async function handleCreate(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createEnrollment(token, {
        clientId: Number(form.clientId),
        courseId: Number(form.courseId),
        teacherId: form.teacherId ? Number(form.teacherId) : null,
        groupName: form.groupName,
        notes: form.notes,
      });
      await refreshWorkspace();
      notify('Запись создана', 'success');
      navigate('/enrollments', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleTeacherUpdate(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateEnrollmentTeacher(token, id, Number(form.teacherId));
      await refreshWorkspace();
      notify('Преподаватель обновлён', 'success');
      navigate('/enrollments', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    try {
      await api.completeEnrollment(token, id, { notes: form.notes || 'Отмечено через страницу редактирования.' });
      await refreshWorkspace();
      notify('Прохождение отмечено', 'success');
      navigate('/enrollments', { replace: true });
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  if (isEdit) {
    return (
      <Stack spacing={3}>
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <SectionTitle title="Редактирование записи" subtitle="Отдельная страница обновления" />
            <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={handleTeacherUpdate}>
              <TextField
                select
                label="Преподаватель"
                fullWidth
                value={form.teacherId}
                onChange={(event) => setForm({ ...form, teacherId: event.target.value })}
              >
                <MenuItem value="">Выберите преподавателя</MenuItem>
                {teachers.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.fullName}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Комментарий"
                multiline
                minRows={3}
                fullWidth
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
              <TextField
                label="Группа в MAX"
                fullWidth
                value={form.groupName}
                onChange={(event) => setForm({ ...form, groupName: event.target.value })}
                disabled={isEdit}
                helperText={
                  isEdit
                    ? 'Группа в MAX задаётся при создании записи и не изменяется на этой странице.'
                    : 'Группа в MAX указывается при создании записи и используется для общей связи в MAX'
                }
              />
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={busy}>
                  Сохранить
                </Button>
                <Button variant="outlined" onClick={() => navigate('/enrollments')}>
                  Назад
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
          <CardContent>
            <SectionTitle title="Завершение обучения" subtitle="Отметка факта прохождения курса" />
            <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              Используется, когда преподаватель подтверждает завершение обучения и автоматически рассчитывается следующая дата.
            </Typography>
            <Button variant="outlined" onClick={handleComplete} disabled={busy}>
              Отметить как завершённое
            </Button>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <SectionTitle title="Новая запись" subtitle="Отдельная страница добавления" />
        {!isAdmin && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Преподаватель может работать с существующими записями, а создание новых записей остаётся за администратором.
          </Alert>
        )}
        <Stack component="form" spacing={2} sx={{ mt: 2 }} onSubmit={handleCreate}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Клиент"
                fullWidth
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
              >
                <MenuItem value="">Выберите клиента</MenuItem>
                {clients.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Курс"
                fullWidth
                value={form.courseId}
                onChange={(event) => setForm({ ...form, courseId: event.target.value })}
              >
                <MenuItem value="">Выберите курс</MenuItem>
                {courses.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.title}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Преподаватель"
                fullWidth
                value={form.teacherId}
                onChange={(event) => setForm({ ...form, teacherId: event.target.value })}
              >
                <MenuItem value="">Выберите преподавателя</MenuItem>
                {teachers.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Комментарий"
                multiline
                minRows={3}
                fullWidth
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Группа в MAX"
                fullWidth
                value={form.groupName}
                onChange={(event) => setForm({ ...form, groupName: event.target.value })}
                helperText="Укажи общую группу для клиента и преподавателя в MAX"
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={busy}>
              Создать
            </Button>
            <Button variant="outlined" onClick={() => navigate('/enrollments')}>
              Отмена
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function NotificationsPage() {
  const { user, dashboard, busy, setBusy, refreshWorkspace, notify, token, navigate } = useOutletContext();
  const notifications = useMemo(() => dashboard?.notifications || [], [dashboard]);
  const isAdmin = user?.role === 'ADMIN';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('due');

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...notifications]
      .filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          [
            item.subject,
            item.message,
            item.recipientEmail,
            item.client?.fullName,
            item.course?.title,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery));
        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
        const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
        const matchesChannel = channelFilter === 'ALL' || item.deliveryChannel === channelFilter;
        return matchesQuery && matchesStatus && matchesType && matchesChannel;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case 'created':
            return compareDates(left.createdAt, right.createdAt);
          case 'sent':
            return compareDates(left.sentAt, right.sentAt);
          case 'status':
            return String(left.status || '').localeCompare(String(right.status || ''), 'ru');
          default:
            return compareDates(left.dueAt, right.dueAt);
        }
      });
  }, [notifications, query, statusFilter, typeFilter, channelFilter, sortBy]);

  async function handleRunReminders() {
    setBusy(true);
    try {
      const result = await api.runReminders(token);
      await refreshWorkspace();
      notify(`Напоминания: создано ${result.generated}, отправлено ${result.sent}`, 'success');
    } catch (error) {
      notify(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <SectionTitle title="Уведомления" subtitle="Email-напоминания о повторном обучении" />
          {isAdmin && (
            <Button variant="contained" onClick={handleRunReminders} disabled={busy}>
              Запустить рассылку
            </Button>
          )}
        </Stack>

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          queryLabel="Поиск"
          queryPlaceholder="Тема, сообщение, email, курс, клиент"
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'due', label: 'Сортировка: по дате контроля' },
            { value: 'created', label: 'Сортировка: по дате создания' },
            { value: 'sent', label: 'Сортировка: по дате отправки' },
            { value: 'status', label: 'Сортировка: по статусу' },
          ]}
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              label: 'Статус',
              options: [
                { value: 'ALL', label: 'Все статусы' },
                { value: 'PENDING', label: 'PENDING' },
                { value: 'SENT', label: 'SENT' },
                { value: 'FAILED', label: 'FAILED' },
              ],
            },
            {
              value: typeFilter,
              onChange: setTypeFilter,
              label: 'Тип',
              options: [
                { value: 'ALL', label: 'Все типы' },
                { value: 'REPEAT_REMINDER', label: 'REPEAT_REMINDER' },
                { value: 'COURSE_ASSIGNMENT', label: 'COURSE_ASSIGNMENT' },
                { value: 'SYSTEM_ALERT', label: 'SYSTEM_ALERT' },
              ],
            },
            {
              value: channelFilter,
              onChange: setChannelFilter,
              label: 'Канал',
              options: [
                { value: 'ALL', label: 'Все каналы' },
                { value: 'EMAIL', label: 'EMAIL' },
                { value: 'INTERNAL', label: 'INTERNAL' },
              ],
            },
          ]}
        />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Найдено: {filteredNotifications.length} из {notifications.length}
        </Typography>

        <Stack spacing={2}>
          {filteredNotifications.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{ p: 2, cursor: 'pointer', transition: 'transform .15s ease', '&:hover': { transform: 'translateY(-1px)' } }}
              onClick={() => navigate(`/notifications/${item.id}`)}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="start" spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {item.subject}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.client?.fullName} · {item.course?.title}
                    </Typography>
                  </Box>
                  <Chip size="small" label={item.status} color={item.status === 'SENT' ? 'success' : 'warning'} variant="outlined" />
                </Stack>
                <Typography variant="body2">{item.message}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Получатель</Typography>
                    <Typography>{item.recipientEmail}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Дата контроля</Typography>
                    <Typography>{formatDate(item.dueAt)}</Typography>
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/notifications/${item.id}`); }}>
                    Открыть
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function UserDetailPage() {
  const { id } = useParams();
  const { user, users, dashboard, navigate } = useOutletContext();
  const selectedUser = users.find((item) => String(item.id) === id) || (user && String(user.id) === id ? user : null);
  const relatedEnrollments = (dashboard?.enrollments || []).filter(
    (item) => item.client?.id === selectedUser?.id || item.teacher?.id === selectedUser?.id
  );
  const relatedNotifications = (dashboard?.notifications || []).filter(
    (item) => item.client?.id === selectedUser?.id
  );
  const isOwnProfile = selectedUser && user && String(selectedUser.id) === String(user.id);
  const canView = user?.role === 'ADMIN' || isOwnProfile;
  const canEditProfile = user?.role === 'ADMIN' || (isOwnProfile && user?.role === 'TEACHER');

  if (!canView) {
    return <Alert severity="warning">Детальная карточка доступна только администратору или владельцу профиля.</Alert>;
  }

  if (!selectedUser) {
    return <Alert severity="error">Пользователь не найден.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={selectedUser.fullName}
        subtitle="Подробная карточка пользователя"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/users')}>
              Назад к списку
            </Button>
            {canEditProfile && (
              <Button variant="contained" onClick={() => navigate(`/users/${selectedUser.id}/edit`)}>
                Редактировать
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Общие данные" subtitle="Все доступные поля из системы">
        <Grid container spacing={2}>
          <DetailField label="ID" value={selectedUser.id} />
          <DetailField label="Фамилия" value={selectedUser.lastName} />
          <DetailField label="Имя" value={selectedUser.firstName} />
          <DetailField label="Полное имя" value={selectedUser.fullName} />
          <DetailField label="Email" value={selectedUser.email} />
          <DetailField label="Телефон" value={selectedUser.phone || 'Не указан'} />
          <DetailField label="MAX" value={selectedUser.maxContact || 'Не указан'} />
          <DetailField label="Роль" value={selectedUser.role} />
          <DetailField
            label="Статус"
            value={<Chip size="small" label={selectedUser.active ? 'Активен' : 'Неактивен'} color={selectedUser.active ? 'success' : 'default'} variant="outlined" />}
          />
          <DetailField label="Создан" value={formatDateTime(selectedUser.createdAt)} />
          <DetailField label="Последний вход" value={formatDateTime(selectedUser.lastLoginAt)} />
        </Grid>
      </DetailSection>

      <DetailSection title="Связанные записи" subtitle="Курс, преподаватель и клиентская история">
        <Grid container spacing={2}>
          <MetricSummary title="Записей" value={relatedEnrollments.length} />
          <MetricSummary title="Уведомлений" value={relatedNotifications.length} />
          <MetricSummary
            title="Активен"
            value={selectedUser.active ? 'Да' : 'Нет'}
          />
        </Grid>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {relatedEnrollments.length === 0 ? (
            <Alert severity="info">Связанных записей нет.</Alert>
          ) : (
            relatedEnrollments.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/enrollments/${item.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.course?.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.teacher?.fullName || 'Без преподавателя'} · {item.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Группа в MAX: {item.groupName || 'Не указана'}
                    </Typography>
                  </Box>
                  <Chip size="small" label={formatDate(item.nextDueAt)} variant="outlined" />
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>

      <DetailSection title="Уведомления" subtitle="Email-события, связанные с пользователем">
        <Stack spacing={2}>
          {relatedNotifications.length === 0 ? (
            <Alert severity="info">Уведомления не найдены.</Alert>
          ) : (
            relatedNotifications.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/notifications/${item.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.subject}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.course?.title} · {item.status}
                    </Typography>
                  </Box>
                  <Chip size="small" label={formatDateTime(item.dueAt)} variant="outlined" />
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>
    </Stack>
  );
}

function CourseDetailPage() {
  const { id } = useParams();
  const { dashboard, navigate, user } = useOutletContext();
  const selectedCourse = dashboard?.courses?.find((item) => String(item.id) === id);
  const relatedPrograms = (dashboard?.programs || []).filter((item) => String(item.course?.id) === String(id));
  const relatedEnrollments = (dashboard?.enrollments || []).filter((item) => String(item.course?.id) === String(id));
  const relatedNotifications = (dashboard?.notifications || []).filter((item) => String(item.course?.id) === String(id));

  if (!selectedCourse) {
    return <Alert severity="error">Курс не найден.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={selectedCourse.title}
        subtitle="Подробная карточка курса"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/courses')}>
              Назад к списку
            </Button>
            {user?.role === 'ADMIN' && (
              <Button variant="contained" onClick={() => navigate(`/courses/${selectedCourse.id}/edit`)}>
                Редактировать
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Параметры курса" subtitle="Максимум доступных данных">
        <Grid container spacing={2}>
          <DetailField label="ID" value={selectedCourse.id} />
          <DetailField label="Название" value={selectedCourse.title} />
          <DetailField label="Описание" value={selectedCourse.description || 'Не указано'} />
          <DetailField label="Формат" value={selectedCourse.trainingFormat} />
          <DetailField label="Период повторения" value={`${selectedCourse.repeatMonths} мес.`} />
          <DetailField label="Программ" value={selectedCourse.programCount} />
          <DetailField label="Активных программ" value={selectedCourse.activeProgramCount} />
          <DetailField
            label="Статус"
            value={<Chip size="small" label={selectedCourse.active ? 'Активен' : 'Неактивен'} color={selectedCourse.active ? 'success' : 'default'} variant="outlined" />}
          />
          <DetailField label="Всего записей" value={selectedCourse.enrollmentCount} />
          <DetailField label="Активных записей" value={selectedCourse.activeEnrollmentCount} />
        </Grid>
      </DetailSection>

      <DetailSection title="Программы" subtitle="Структура курса">
        <Stack spacing={2}>
          {relatedPrograms.length === 0 ? (
            <Alert severity="info">Программ по курсу нет.</Alert>
          ) : (
            relatedPrograms.map((program) => (
              <Paper
                key={program.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/programs/${program.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{program.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{program.description}</Typography>
                  </Box>
                  <Chip size="small" label={`Лекций: ${program.lessonCount}, тестов: ${program.testCount}`} variant="outlined" />
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>

      <DetailSection title="Записи на курс" subtitle="Кто обучается по этой программе">
        <Stack spacing={2}>
          {relatedEnrollments.length === 0 ? (
            <Alert severity="info">Записей на курс нет.</Alert>
          ) : (
            relatedEnrollments.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/enrollments/${item.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.client?.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.teacher?.fullName || 'Без преподавателя'} · {item.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Группа в MAX: {item.groupName || 'Не указана'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Typography variant="body2" color="text.secondary">
                      Следующее обучение
                    </Typography>
                    <Typography>{formatDate(item.nextDueAt)}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>

      <DetailSection title="Уведомления" subtitle="Напоминания по этому курсу">
        <Stack spacing={2}>
          {relatedNotifications.length === 0 ? (
            <Alert severity="info">Уведомлений по курсу нет.</Alert>
          ) : (
            relatedNotifications.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/notifications/${item.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.subject}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.client?.fullName} · {item.status}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary">{formatDateTime(item.createdAt)}</Typography>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>
    </Stack>
  );
}

function EnrollmentDetailPage() {
  const { id } = useParams();
  const { dashboard, user, token, busy, setBusy, refreshWorkspace, notify, navigate } = useOutletContext();
  const selectedEnrollment = dashboard?.enrollments?.find((item) => String(item.id) === id);
  const relatedNotifications = (dashboard?.notifications || []).filter((item) => String(item.enrollmentId) === String(id));
  const canEdit = user?.role === 'ADMIN' || user?.role === 'METHODIST' || (user?.role === 'TEACHER' && String(selectedEnrollment?.teacher?.id) === String(user?.id));
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    setGroupName(selectedEnrollment?.groupName || '');
  }, [selectedEnrollment]);

  if (!selectedEnrollment) {
    return <Alert severity="error">Запись не найдена.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={`${selectedEnrollment.client?.fullName || 'Клиент'} · ${selectedEnrollment.course?.title || 'Курс'}`}
        subtitle="Подробная карточка записи на обучение"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/enrollments')}>
              Назад к списку
            </Button>
            {canEdit && (
              <Button variant="contained" onClick={() => navigate(`/enrollments/${selectedEnrollment.id}/edit`)}>
                Редактировать
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Основная информация" subtitle="Все данные записи">
        <Grid container spacing={2}>
          <DetailField label="ID" value={selectedEnrollment.id} />
          <DetailField label="Клиент" value={selectedEnrollment.client?.fullName} />
          <DetailField label="Email клиента" value={selectedEnrollment.client?.email} />
          <DetailField label="Курс" value={selectedEnrollment.course?.title} />
          <DetailField label="Преподаватель" value={selectedEnrollment.teacher?.fullName || 'Не назначен'} />
          <DetailField label="Группа в MAX" value={selectedEnrollment.groupName || 'Не указана'} />
          <DetailField label="Дата записи" value={formatDate(selectedEnrollment.enrolledAt)} />
          <DetailField label="Дата завершения" value={formatDate(selectedEnrollment.completedAt)} />
          <DetailField label="Следующее обучение" value={formatDate(selectedEnrollment.nextDueAt)} />
          <DetailField
            label="Статус"
            value={<Chip size="small" label={selectedEnrollment.status} color={selectedEnrollment.status === 'ACTIVE' ? 'success' : 'default'} variant="outlined" />}
          />
          <DetailField label="Комментарий" value={selectedEnrollment.notes || 'Нет комментария'} />
        </Grid>
      </DetailSection>

      <DetailSection title="Группа в MAX" subtitle="Общая группа преподавателя и клиента в MAX">
        <Stack spacing={2}>
          <TextField
            label="Группа в MAX"
            fullWidth
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            disabled={!canEdit}
            helperText={canEdit ? 'Преподаватель этой записи или администратор может обновить группу.' : 'Изменение недоступно.'}
          />
          {canEdit && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api.updateEnrollmentGroup(token, selectedEnrollment.id, { groupName });
                    await refreshWorkspace();
                    notify('Группа в MAX обновлена', 'success');
                  } catch (error) {
                    notify(error);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Сохранить группу
              </Button>
            </Stack>
          )}
        </Stack>
      </DetailSection>

      <DetailSection title="Преподаватель" subtitle="Карточка преподавателя по этой записи">
        {selectedEnrollment.teacher?.id ? (
          <Paper
            variant="outlined"
            sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
            onClick={() => navigate(`/teachers/${selectedEnrollment.teacher.id}`)}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{selectedEnrollment.teacher.fullName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedEnrollment.teacher.email} · {selectedEnrollment.teacher.role}
                </Typography>
              </Box>
              <Button variant="outlined" onClick={(event) => { event.stopPropagation(); navigate(`/teachers/${selectedEnrollment.teacher.id}`); }}>
                Открыть преподавателя
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Alert severity="info">Преподаватель для этой записи не назначен.</Alert>
        )}
      </DetailSection>

      <DetailSection title="Уведомления по записи" subtitle="Напоминания и email-уведомления">
        <Stack spacing={2}>
          {relatedNotifications.length === 0 ? (
            <Alert severity="info">Уведомлений по записи нет.</Alert>
          ) : (
            relatedNotifications.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/notifications/${item.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.subject}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.status} · {item.deliveryChannel}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary">{formatDateTime(item.createdAt)}</Typography>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>
    </Stack>
  );
}

function TeacherDetailPage() {
  const { id } = useParams();
  const { dashboard, navigate, user } = useOutletContext();
  const teacherFromEnrollments = (dashboard?.enrollments || [])
    .flatMap((enrollment) => [String(enrollment.teacher?.id) === String(id) ? enrollment.teacher : null])
    .find(Boolean);
  const selectedTeacher =
    teacherFromEnrollments ||
    (dashboard?.users || []).find((item) => String(item.id) === id) ||
    null;
  const relatedEnrollments = (dashboard?.enrollments || []).filter(
    (item) => String(item.teacher?.id) === String(id)
  );
  const relatedCourses = (dashboard?.courses || []).filter((course) =>
    relatedEnrollments.some((enrollment) => String(enrollment.course?.id) === String(course.id))
  );
  const isOwnTeacher = user?.id && String(user.id) === String(id);
  const canEditProfile = user?.role === 'ADMIN' || isOwnTeacher;

  if (!selectedTeacher) {
    return <Alert severity="error">Преподаватель не найден.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={selectedTeacher.fullName}
        subtitle="Подробная карточка преподавателя"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/enrollments')}>
              Назад к записям
            </Button>
            {canEditProfile && (
              <Button variant="contained" onClick={() => navigate(`/users/${selectedTeacher.id}/edit`)}>
                Редактировать профиль
              </Button>
            )}
            {(user?.role === 'ADMIN' || isOwnTeacher) && (
              <Button variant="outlined" onClick={() => navigate(`/users/${selectedTeacher.id}`)}>
                Открыть профиль
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Профиль" subtitle="Данные преподавателя">
        <Grid container spacing={2}>
          <DetailField label="ID" value={selectedTeacher.id} />
          <DetailField label="ФИО" value={selectedTeacher.fullName} />
          <DetailField label="Email" value={selectedTeacher.email} />
          <DetailField label="MAX" value={selectedTeacher.maxContact || 'Не указан'} />
          <DetailField label="Роль" value={selectedTeacher.role} />
        </Grid>
      </DetailSection>

      <DetailSection title="Работа с клиентами" subtitle="Записи, где преподаватель назначен">
        <Grid container spacing={2}>
          <MetricSummary title="Записей" value={relatedEnrollments.length} />
          <MetricSummary title="Курсов" value={relatedCourses.length} />
        </Grid>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {relatedEnrollments.length === 0 ? (
            <Alert severity="info">Пока нет записей, связанных с этим преподавателем.</Alert>
          ) : (
            relatedEnrollments.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/enrollments/${item.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{item.client?.fullName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.course?.title} · {item.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Группа в MAX: {item.groupName || 'Не указана'}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary">{formatDate(item.nextDueAt)}</Typography>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>

      <DetailSection title="Курсы" subtitle="Программы, по которым работает преподаватель">
        <Stack spacing={2}>
          {relatedCourses.length === 0 ? (
            <Alert severity="info">Связанные курсы не найдены.</Alert>
          ) : (
            relatedCourses.map((course) => (
              <Paper
                key={course.id}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{course.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {course.description}
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${course.programCount} программ`} variant="outlined" />
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DetailSection>
    </Stack>
  );
}

function NotificationDetailPage() {
  const { id } = useParams();
  const { dashboard, navigate } = useOutletContext();
  const selectedNotification = dashboard?.notifications?.find((item) => String(item.id) === id);

  if (!selectedNotification) {
    return <Alert severity="error">Уведомление не найдено.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <DetailHeader
        title={selectedNotification.subject}
        subtitle="Подробная карточка уведомления"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => navigate('/notifications')}>
              Назад к списку
            </Button>
            {selectedNotification.enrollmentId && (
              <Button variant="contained" onClick={() => navigate(`/enrollments/${selectedNotification.enrollmentId}`)}>
                Открыть запись
              </Button>
            )}
          </Stack>
        }
      />

      <DetailSection title="Содержимое уведомления" subtitle="Вся доступная информация">
        <Grid container spacing={2}>
          <DetailField label="ID" value={selectedNotification.id} />
          <DetailField label="Тип" value={selectedNotification.type} />
          <DetailField label="Канал" value={selectedNotification.deliveryChannel} />
          <DetailField label="Статус" value={selectedNotification.status} />
          <DetailField label="Получатель" value={selectedNotification.recipientEmail} />
          <DetailField label="Клиент" value={selectedNotification.client?.fullName} />
          <DetailField label="Курс" value={selectedNotification.course?.title} />
          <DetailField label="Запись ID" value={selectedNotification.enrollmentId} />
          <DetailField label="Дата контроля" value={formatDate(selectedNotification.dueAt)} />
          <DetailField label="Создано" value={formatDateTime(selectedNotification.createdAt)} />
          <DetailField label="Отправлено" value={formatDateTime(selectedNotification.sentAt)} />
          <DetailField label="Ошибка" value={selectedNotification.failureReason || 'Нет ошибок'} />
        </Grid>
      </DetailSection>

      <DetailSection title="Текст сообщения" subtitle="Тема и содержимое письма">
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Тема
          </Typography>
          <Typography sx={{ mb: 2 }}>{selectedNotification.subject}</Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Сообщение
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{selectedNotification.message}</Typography>
        </Paper>
      </DetailSection>

      <DetailSection title="Связанные переходы" subtitle="Быстрый доступ к клиенту и курсу">
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {selectedNotification.client?.id && (
            <Button variant="outlined" onClick={() => navigate(`/users/${selectedNotification.client.id}`)}>
              Карточка клиента
            </Button>
          )}
          {selectedNotification.course?.id && (
            <Button variant="outlined" onClick={() => navigate(`/courses/${selectedNotification.course.id}`)}>
              Карточка курса
            </Button>
          )}
          {selectedNotification.enrollmentId && (
            <Button variant="outlined" onClick={() => navigate(`/enrollments/${selectedNotification.enrollmentId}`)}>
              Карточка записи
            </Button>
          )}
        </Stack>
      </DetailSection>
    </Stack>
  );
}

function DetailHeader({ title, subtitle, actions }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: 1,
        borderColor: 'divider',
        background: 'linear-gradient(135deg, rgba(26,115,232,0.08), rgba(251,188,4,0.08))',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Подробная информация
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        </Box>
        {actions}
      </Stack>
    </Paper>
  );
}

function DetailSection({ title, subtitle, children }) {
  return (
    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
      <SectionTitle title={title} subtitle={subtitle} />
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Paper>
  );
}

function DetailField({ label, value }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50', border: 1, borderColor: 'divider', height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {label}
        </Typography>
        <Box sx={{ mt: 0.5, wordBreak: 'break-word' }}>
          {value ?? 'Не указано'}
        </Box>
      </Box>
    </Grid>
  );
}

function MetricSummary({ title, value }) {
  return (
    <Grid item xs={12} sm={4}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
          {value}
        </Typography>
      </Paper>
    </Grid>
  );
}

function ListToolbar({
  query,
  onQueryChange,
  queryLabel,
  queryPlaceholder,
  sortValue,
  onSortChange,
  sortOptions,
  filters = [],
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            label={queryLabel}
            placeholder={queryPlaceholder}
            fullWidth
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            select
            label="Сортировка"
            fullWidth
            value={sortValue}
            onChange={(event) => onSortChange(event.target.value)}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        {filters.map((filter) => (
          <Grid item xs={12} md={4} key={filter.label}>
            <TextField
              select
              label={filter.label}
              fullWidth
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
            >
              {filter.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

function MetricCard({ title, value }) {
  return (
    <Grid item xs={6} md={4} lg={2}>
      <Card elevation={0} sx={{ border: 1, borderColor: 'divider', height: '100%' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

function InfoCard({ title, text }) {
  return (
    <Grid item xs={12} md={4}>
      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {text}
        </Typography>
      </Paper>
    </Grid>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {subtitle}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
    </Box>
  );
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

function formatDateTime(value) {
  if (!value) {
    return 'Не указано';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function compareDates(left, right) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

function getTestProgressState(test) {
  if (!test) {
    return { label: 'Нет данных', color: 'default', variant: 'outlined' };
  }

  if (test.bestPassed) {
    return { label: 'Успешно', color: 'success', variant: 'filled' };
  }

  const attemptsLeft = Number(test.maxAttempts || 0) - Number(test.attemptCount || 0);
  if (attemptsLeft > 0) {
    return { label: `Неуспешно, попыток осталось: ${attemptsLeft}`, color: 'warning', variant: 'outlined' };
  }

  return { label: 'Неуспешно, попытки закончились', color: 'error', variant: 'filled' };
}

function StatusChip({ test }) {
  const state = getTestProgressState(test);
  return <Chip size="small" label={state.label} color={state.color} variant={state.variant} />;
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
