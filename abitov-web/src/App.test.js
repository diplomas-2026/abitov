import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/auth/demo-users')) {
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve([]),
      });
    }
    return Promise.resolve({
      ok: false,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });
  });
});

afterEach(() => {
  global.fetch.mockRestore?.();
});

test('renders login screen', async () => {
  render(<App />);
  expect(await screen.findByText(/Система ведения клиентской базы/i)).toBeInTheDocument();
});
