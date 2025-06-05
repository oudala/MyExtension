import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import Links from './pages/Links';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </SocketProvider>
              </ProtectedRoute>
            } />
            <Route path="/friends" element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout>
                    <Friends />
                  </Layout>
                </SocketProvider>
              </ProtectedRoute>
            } />
            <Route path="/links" element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout>
                    <Links />
                  </Layout>
                </SocketProvider>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;