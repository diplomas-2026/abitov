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
  LinearProgress,
  MenuItem,
  Paper,
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
  notes: '',
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
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [enrollmentForm, setEnrollmentForm] = useState(emptyEnrollmentForm);
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
    void loadWorkspace(token).catch(() => {});
  }, [token]);

  const courses = dashboard?.courses || [];
  const enrollments = dashboard?.enrollments || [];
  const notifications = dashboard?.notifications || [];
  const stats = dashboard?.summary;
  const visibleUsers = useMemo(() => {
    if (user?.role === 'ADMIN') {
      return users;
    }
    return user ? [user] : [];
  }, [user, users]);
  const clients = visibleUsers.filter((item) => item.role === 'CLIENT');
  const teachers = visibleUsers.filter((item) => item.role === 'TEACHER');

  async function loadWorkspace(currentToken) {
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
        const userList = await api.users(currentToken);
        setUsers(userList);
        bootstrapForms(dashboardData, userList, meData);
      } else {
        setUsers([meData]);
        bootstrapForms(dashboardData, [meData], meData);
      }
      return true;
    } catch (error) {
      handleApiError(error);
      logout();
      return false;
    } finally {
      setLoading(false);
    }
  }

  function bootstrapForms(dashboardData, userList, currentUser) {
    const firstCourse = dashboardData?.courses?.[0];
    const firstClient = userList.find((item) => item.role === 'CLIENT');
    const firstTeacher = userList.find((item) => item.role === 'TEACHER');

    if (currentUser?.role === 'ADMIN') {
      setEnrollmentForm((prev) => ({
        ...prev,
        clientId: prev.clientId || String(firstClient?.id || ''),
        courseId: prev.courseId || String(firstCourse?.id || ''),
        teacherId: prev.teacherId || String(firstTeacher?.id || ''),
      }));
    } else {
      setEnrollmentForm((prev) => ({
        ...prev,
        courseId: prev.courseId || String(firstCourse?.id || ''),
      }));
    }
  }

  function handleApiError(error) {
    const message = error instanceof Error ? error.message : 'Не удалось выполнить запрос';
    setSnackbar({ open: true, message, severity: 'error' });
  }

  function handleSuccess(message) {
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

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.login(loginForm);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      handleSuccess(`Добро пожаловать, ${response.user.fullName}`);
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    if (!token) {
      return;
    }
    setBusy(true);
    try {
      const ok = await loadWorkspace(token);
      if (ok) {
        handleSuccess('Данные обновлены');
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createUser(token, userForm);
      setUserForm(emptyUserForm);
      await refreshAll();
      handleSuccess('Пользователь создан');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser(id) {
    setBusy(true);
    try {
      await api.deleteUser(token, id);
      await refreshAll();
      handleSuccess('Пользователь удалён');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCourse(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createCourse(token, {
        ...courseForm,
        repeatMonths: Number(courseForm.repeatMonths),
      });
      setCourseForm(emptyCourseForm);
      await refreshAll();
      handleSuccess('Курс создан');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCourse(id) {
    setBusy(true);
    try {
      await api.deleteCourse(token, id);
      await refreshAll();
      handleSuccess('Курс удалён');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateEnrollment(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createEnrollment(token, {
        clientId: Number(enrollmentForm.clientId),
        courseId: Number(enrollmentForm.courseId),
        teacherId: enrollmentForm.teacherId ? Number(enrollmentForm.teacherId) : null,
        notes: enrollmentForm.notes,
      });
      setEnrollmentForm(emptyEnrollmentForm);
      await refreshAll();
      handleSuccess('Слушатель записан на курс');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteEnrollment(id) {
    setBusy(true);
    try {
      await api.completeEnrollment(token, id, { notes: 'Отмечено через веб-интерфейс.' });
      await refreshAll();
      handleSuccess('Прохождение отмечено');
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleRunReminders() {
    setBusy(true);
    try {
      const result = await api.runReminders(token);
      await refreshAll();
      handleSuccess(`Напоминания: создано ${result.generated}, отправлено ${result.sent}`);
    } catch (error) {
      handleApiError(error);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <ThemeProvider theme={materialTheme}>
        <CssBaseline />
        <LoginScreen
          demoUsers={demoUsers}
          loginForm={loginForm}
          busy={busy}
          onLogin={handleLogin}
          onDemoFill={setLoginForm}
          onChange={setLoginForm}
          snackbar={snackbar}
          onCloseSnackbar={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={materialTheme}>
      <CssBaseline />
      {loading && <LinearProgress />}
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="sticky" elevation={0} color="inherit" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 2, py: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>A</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Контур повторного обучения
              </Typography>
              <Typography variant="body2" color="text.secondary">
                АНО ДПО «Региональный центр охраны труда»
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={refreshAll} disabled={busy}>
                Обновить
              </Button>
              <Button variant="text" onClick={logout}>
                Выйти
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              border: 1,
              borderColor: 'divider',
              background: 'linear-gradient(135deg, rgba(26,115,232,0.08), rgba(251,188,4,0.08))',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
              <Box>
                <Chip label={user?.role || 'USER'} color="primary" variant="outlined" sx={{ mb: 1 }} />
                <Typography variant="h4" gutterBottom>
                  {user?.fullName}
                </Typography>
                <Typography color="text.secondary">{user?.email}</Typography>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Typography variant="body2" color="text.secondary">
                  В систему вошёл пользователь
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {user?.role === 'ADMIN' ? 'Администратор' : user?.role === 'TEACHER' ? 'Преподаватель' : 'Клиент / слушатель'}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <MetricCard title="Пользователи" value={stats?.totalUsers ?? 0} />
            <MetricCard title="Клиенты" value={stats?.totalClients ?? 0} />
            <MetricCard title="Преподаватели" value={stats?.totalTeachers ?? 0} />
            <MetricCard title="Курсы" value={stats?.totalCourses ?? 0} />
            <MetricCard title="Активные записи" value={stats?.activeEnrollments ?? 0} />
            <MetricCard title="Напоминания" value={stats?.upcomingRepeats ?? 0} />
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <CardContent>
                  <SectionTitle title="Курсы" subtitle="Программы и срок повторного обучения" />
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Курс</TableCell>
                          <TableCell>Формат</TableCell>
                          <TableCell>Повтор</TableCell>
                          <TableCell>Статус</TableCell>
                          {user?.role === 'ADMIN' && <TableCell align="right">Действия</TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {courses.map((course) => (
                          <TableRow key={course.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2">{course.title}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {course.description}
                              </Typography>
                            </TableCell>
                            <TableCell>{course.trainingFormat}</TableCell>
                            <TableCell>{course.repeatMonths} мес.</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={course.active ? 'Активен' : 'Неактивен'}
                                color={course.active ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </TableCell>
                            {user?.role === 'ADMIN' && (
                              <TableCell align="right">
                                <Button size="small" color="error" onClick={() => handleDeleteCourse(course.id)} disabled={busy}>
                                  Удалить
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {user?.role === 'ADMIN' && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Stack component="form" spacing={2} onSubmit={handleCreateCourse}>
                        <Typography variant="h6">Новый курс</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Название"
                              fullWidth
                              value={courseForm.title}
                              onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Формат"
                              fullWidth
                              value={courseForm.trainingFormat}
                              onChange={(event) => setCourseForm({ ...courseForm, trainingFormat: event.target.value })}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Период повторения (мес.)"
                              type="number"
                              fullWidth
                              value={courseForm.repeatMonths}
                              onChange={(event) => setCourseForm({ ...courseForm, repeatMonths: event.target.value })}
                            />
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <TextField
                              label="Описание"
                              fullWidth
                              multiline
                              minRows={3}
                              value={courseForm.description}
                              onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })}
                            />
                          </Grid>
                        </Grid>
                        <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
                          Создать курс
                        </Button>
                      </Stack>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card elevation={0} sx={{ border: 1, borderColor: 'divider', mb: 3 }}>
                <CardContent>
                  <SectionTitle title="Записи" subtitle="Слушатели, преподаватели и сроки повторного обучения" />
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {enrollments.map((item) => (
                      <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
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
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary">
                                Преподаватель
                              </Typography>
                              <Typography>{item.teacher?.fullName || 'Не назначен'}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary">
                                Следующее обучение
                              </Typography>
                              <Typography>{formatDate(item.nextDueAt)}</Typography>
                            </Grid>
                          </Grid>
                          {item.notes && (
                            <Typography variant="body2" color="text.secondary">
                              {item.notes}
                            </Typography>
                          )}
                          {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && item.status !== 'COMPLETED' && (
                            <Button variant="outlined" onClick={() => handleCompleteEnrollment(item.id)} disabled={busy} sx={{ alignSelf: 'flex-start' }}>
                              Отметить завершение
                            </Button>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                <CardContent>
                  <SectionTitle title="Уведомления" subtitle="Автоматические письма о повторном обучении" />
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    {notifications.map((item) => (
                      <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
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
                            <Chip
                              size="small"
                              label={item.status}
                              color={item.status === 'SENT' ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="body2">{item.message}</Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary">
                                Получатель
                              </Typography>
                              <Typography>{item.recipientEmail}</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary">
                                Дата контроля
                              </Typography>
                              <Typography>{formatDate(item.dueAt)}</Typography>
                            </Grid>
                          </Grid>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                  {user?.role === 'ADMIN' && (
                    <Button variant="contained" onClick={handleRunReminders} disabled={busy} sx={{ mt: 3 }}>
                      Запустить рассылку напоминаний
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {user?.role === 'ADMIN' && (
            <Grid container spacing={3} sx={{ mt: 0 }}>
              <Grid item xs={12} lg={6}>
                <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                  <CardContent>
                    <SectionTitle title="Пользователи" subtitle="Администрирование аккаунтов" />
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ФИО</TableCell>
                            <TableCell>Роль</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell align="right">Действия</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {visibleUsers.map((item) => (
                            <TableRow key={item.id} hover>
                              <TableCell>{item.fullName}</TableCell>
                              <TableCell>{item.role}</TableCell>
                              <TableCell>{item.email}</TableCell>
                              <TableCell align="right">
                                <Button size="small" color="error" onClick={() => handleDeleteUser(item.id)} disabled={busy}>
                                  Удалить
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Divider sx={{ my: 3 }} />
                    <Stack component="form" spacing={2} onSubmit={handleCreateUser}>
                      <Typography variant="h6">Новый пользователь</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Фамилия"
                            fullWidth
                            value={userForm.lastName}
                            onChange={(event) => setUserForm({ ...userForm, lastName: event.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Имя"
                            fullWidth
                            value={userForm.firstName}
                            onChange={(event) => setUserForm({ ...userForm, firstName: event.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Email"
                            fullWidth
                            value={userForm.email}
                            onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Телефон"
                            fullWidth
                            value={userForm.phone}
                            onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            label="Пароль"
                            type="password"
                            fullWidth
                            value={userForm.password}
                            onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            select
                            label="Роль"
                            fullWidth
                            value={userForm.role}
                            onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
                          >
                            <MenuItem value="ADMIN">Администратор</MenuItem>
                            <MenuItem value="TEACHER">Преподаватель</MenuItem>
                            <MenuItem value="CLIENT">Клиент / слушатель</MenuItem>
                          </TextField>
                        </Grid>
                      </Grid>
                      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
                        Создать пользователя
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={6}>
                <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                  <CardContent>
                    <SectionTitle title="Новая запись" subtitle="Назначение клиента, курса и преподавателя" />
                    <Stack component="form" spacing={2} onSubmit={handleCreateEnrollment} sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            select
                            label="Клиент"
                            fullWidth
                            value={enrollmentForm.clientId}
                            onChange={(event) => setEnrollmentForm({ ...enrollmentForm, clientId: event.target.value })}
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
                            value={enrollmentForm.courseId}
                            onChange={(event) => setEnrollmentForm({ ...enrollmentForm, courseId: event.target.value })}
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
                            value={enrollmentForm.teacherId}
                            onChange={(event) => setEnrollmentForm({ ...enrollmentForm, teacherId: event.target.value })}
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
                            value={enrollmentForm.notes}
                            onChange={(event) => setEnrollmentForm({ ...enrollmentForm, notes: event.target.value })}
                          />
                        </Grid>
                      </Grid>
                      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
                        Записать на курс
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Container>

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
      </Box>
    </ThemeProvider>
  );
}

function LoginScreen({ demoUsers, loginForm, busy, onLogin, onDemoFill, onChange, snackbar, onCloseSnackbar }) {
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
                    onClick={() => onDemoFill({ email: item.email, password: item.password })}
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
              <Stack component="form" spacing={2} onSubmit={onLogin}>
                <TextField
                  label="Email"
                  fullWidth
                  value={loginForm.email}
                  onChange={(event) => onChange((prev) => ({ ...prev, email: event.target.value }))}
                />
                <TextField
                  label="Пароль"
                  type="password"
                  fullWidth
                  value={loginForm.password}
                  onChange={(event) => onChange((prev) => ({ ...prev, password: event.target.value }))}
                />
                <Button type="submit" variant="contained" size="large" disabled={busy}>
                  Войти
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={onCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
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
