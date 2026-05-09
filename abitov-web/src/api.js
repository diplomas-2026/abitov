const API_BASE = process.env.REACT_APP_API_BASE_URL || 'https://abitov.danbel.ru/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && payload.message
      ? payload.message
      : response.statusText || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body }),
  demoUsers: () => request('/auth/demo-users'),
  me: (token) => request('/auth/me', { token }),
  dashboard: (token) => request('/dashboard', { token }),
  users: (token, role) => request(role ? `/users?role=${role}` : '/users', { token }),
  createUser: (token, body) => request('/users', { method: 'POST', token, body }),
  updateUser: (token, id, body) => request(`/users/${id}`, { method: 'PUT', token, body }),
  deleteUser: (token, id) => request(`/users/${id}`, { method: 'DELETE', token }),
  courses: (token) => request('/courses', { token }),
  createCourse: (token, body) => request('/courses', { method: 'POST', token, body }),
  updateCourse: (token, id, body) => request(`/courses/${id}`, { method: 'PUT', token, body }),
  deleteCourse: (token, id) => request(`/courses/${id}`, { method: 'DELETE', token }),
  enrollments: (token) => request('/enrollments', { token }),
  createEnrollment: (token, body) => request('/enrollments', { method: 'POST', token, body }),
  completeEnrollment: (token, id, body) => request(`/enrollments/${id}/complete`, { method: 'POST', token, body }),
  updateEnrollmentTeacher: (token, id, teacherId) => request(`/enrollments/${id}/teacher/${teacherId}`, { method: 'PUT', token }),
  notifications: (token) => request('/notifications', { token }),
  runReminders: (token) => request('/notifications/run-reminders', { method: 'POST', token }),
};

export { API_BASE };
