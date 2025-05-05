import React from 'react';
import { AuthProvider, useAuth } from './auth';
import LoginForm from './LoginForm';
import Dashboard from './Dashboard';

function Header() {
  const { token, logout } = useAuth();
  return (
    <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-semibold text-gray-800">API Gateway Admin</h1>
      {token && (
        <button
          onClick={logout}
          className="text-blue-600 hover:underline text-sm focus:outline-none"
        >
          Logout
        </button>
      )}
    </header>
  );
}

function AppContent() {
  const { token } = useAuth();
  return token ? <Dashboard /> : <LoginForm />;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-grow">
          <AppContent />
        </main>
      </div>
    </AuthProvider>
  );
}
