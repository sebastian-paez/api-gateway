import React, { useState } from 'react';

export default function LoginForm() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        // Send credentials as query params
        const res = await fetch(
          `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
          { method: 'POST' }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Login failed');
        }
        const data = await res.json();
        // Store token and reload to trigger Dashboard
        localStorage.setItem('token', data.access_token);
        window.location.reload();
      } else {
        const res = await fetch(
          `/register?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
          { method: 'POST' }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Registration failed');
        }
        // After successful registration, switch to login mode
        setMode('login');
      }
    } catch (err) {
      if (err.message == "Invalid credentials" || err.message == "User already exists") {
        setError(err.message);
      } else {
        setError("API Gateway is down");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {mode === 'login' ? 'Log In' : 'Register'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {mode === 'login' ? 'Log In' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
            <button
              onClick={() => setMode('register')}
              className="text-blue-600 hover:underline"
            >
              Register
            </button>
            </>
          ) : (
            <>Already have an account?{' '}
            <button
              onClick={() => setMode('login')}
              className="text-blue-600 hover:underline"
            >
              Log In
            </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
