import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Profile from './components/Profile';
import VaultSelection from './components/VaultSelection';
import ChatInterface from './components/ChatInterface';
import AuthGuard from './components/AuthGuard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/profile" 
            element={
              <AuthGuard>
                <Profile />
              </AuthGuard>
            } 
          />
          <Route 
            path="/vault-selection" 
            element={
              <AuthGuard>
                <VaultSelection />
              </AuthGuard>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <AuthGuard>
                <ChatInterface />
              </AuthGuard>
            } 
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
