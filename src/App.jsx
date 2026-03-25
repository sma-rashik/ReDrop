import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/admin-secret-rashik" element={<AdminPanel />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
