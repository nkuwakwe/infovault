import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { api } from '../services/api';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in and has profile
    const checkUserProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch('http://localhost:5000/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.display_name) {
            // User has a profile, check if they have vaults
            const vaultsResponse = await fetch('http://localhost:5000/api/vaults/user', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (vaultsResponse.ok) {
              const vaultsData = await vaultsResponse.json();
              if (vaultsData.vaults && vaultsData.vaults.length > 0) {
                // User has vaults, redirect to chat
                navigate('/chat');
              } else {
                // User has profile but no vaults, redirect to vault selection
                navigate('/vault-selection');
              }
            }
          } else {
            // User is logged in but no profile, redirect to profile
            navigate('/profile');
          }
        }
      } catch (error) {
        console.error('Error checking user profile:', error);
      }
    };

    checkUserProfile();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await api.login(email, password);
      console.log('Login successful:', result);
      
      // After successful login, check user profile and redirect appropriately
      const token = localStorage.getItem('access_token');
      
      // Check if user has a profile
      const profileResponse = await fetch('http://localhost:5000/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.user && profileData.user.display_name) {
          // User has a profile, check if they have vaults
          const vaultsResponse = await fetch('http://localhost:5000/api/vaults/user', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (vaultsResponse.ok) {
            const vaultsData = await vaultsResponse.json();
            if (vaultsData.vaults && vaultsData.vaults.length > 0) {
              // User has vaults, redirect to chat
              navigate('/chat');
            } else {
              // User has profile but no vaults, redirect to vault selection
              navigate('/vault-selection');
            }
          } else {
            // Error checking vaults, redirect to vault selection
            navigate('/vault-selection');
          }
        } else {
          // User is logged in but no profile, redirect to profile
          navigate('/profile');
        }
      } else {
        // Error checking profile, redirect to profile
        navigate('/profile');
      }
      
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
            fontFamily: 'Poppins, sans-serif',
            textAlign: 'center',
            width: '293px'
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
            required
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
            required
          />
        </div>
        
        <button 
          onClick={handleSubmit}
          disabled={isLoading || !email || !password}
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
            cursor: (isLoading || !email || !password) ? 'not-allowed' : 'pointer',
            opacity: (isLoading || !email || !password) ? 0.6 : 1
          }}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
};

export default Login;
