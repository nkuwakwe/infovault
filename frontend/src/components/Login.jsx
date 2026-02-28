import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await api.login(email, password);
      console.log('Login successful:', result);
      
      // Redirect to profile page on successful login
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="frame">
      <img className="image" src="/img/logo.png" alt="InfoVault Logo" />
      <div className="div">
        <div className="text-wrapper">Welcome Back</div>
        <p className="p">Do you have your key?</p>
        
        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            fontSize: '14px', 
            marginLeft: '19px',
            marginTop: '10px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            {error}
          </div>
        )}
        
        <div className="text-wrapper-2">Email</div>
        <div className="div-2">
          <img className="img" src="/img/email.png" alt="Email" />
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffffb0',
              fontFamily: 'Poppins-SemiBold, Helvetica',
              fontWeight: '600',
              fontSize: '15px',
              outline: 'none',
              width: '199px',
              marginTop: '15px'
            }}
            disabled={isLoading}
          />
        </div>
        
        <div className="text-wrapper-4">Password</div>
        <div className="div-2">
          <img className="img" src="/img/password.png" alt="Password" />
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffffb0',
              fontFamily: 'Poppins-SemiBold, Helvetica',
              fontWeight: '600',
              fontSize: '15px',
              outline: 'none',
              width: '199px',
              marginTop: '15px'
            }}
            disabled={isLoading}
          />
        </div>
        
        <button 
          onClick={handleSubmit}
          disabled={isLoading}
          style={{
            marginLeft: '41px',
            width: '293px',
            height: '52px',
            marginTop: '30px',
            background: 'linear-gradient(270deg, rgba(246, 142, 16, 0.8) 0%, rgba(255, 166, 0, 0.9) 100%)',
            border: '1px solid rgba(219, 176, 86, 0.25)',
            borderRadius: '11px',
            color: '#000000',
            fontFamily: 'Poppins-Bold, Helvetica',
            fontWeight: '700',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
};

export default Login;
