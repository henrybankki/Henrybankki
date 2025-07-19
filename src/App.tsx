import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminPanel from './components/AdminPanel';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import Login from './components/Login';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;