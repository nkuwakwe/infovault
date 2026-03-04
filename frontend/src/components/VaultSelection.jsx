import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './VaultSelection.css';

const VaultSelection = () => {
  const [vaults, setVaults] = useState([]);
  const [selectedVault, setSelectedVault] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVaults();
  }, []);

  const fetchVaults = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vaults', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch vaults');
      }
      
      setVaults(data.vaults || []);
    } catch (err) {
      setError(err.message || 'Failed to load vaults');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaultSelect = (vault) => {
    setSelectedVault(vault);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVault) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/vaults/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ vaultId: selectedVault.id })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join vault');
      }
      
      console.log('Successfully joined vault:', data);
      // Redirect to chat interface
      navigate('/chat');
      
    } catch (err) {
      setError(err.message || 'Failed to join vault');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="frame">
        <div className="logo">
          <img src="/img/logo.png" alt="InfoVault Logo" />
        </div>
        <div className="card">
          <div className="title">Choose Your Vault</div>
          <div className="subtitle">Loading vaults...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="frame">
      <div className="logo">
        <img src="/img/logo.png" alt="InfoVault Logo" />
      </div>

      <div className="card">
        <div className="title">Choose Your Vault</div>
        <div className="subtitle">Select a focus for your Infovault</div>

        {error && (
          <div style={{ 
            color: '#ff6b6b', 
            fontSize: '14px', 
            textAlign: 'center',
            margin: '20px 41px',
            fontFamily: 'Poppins, sans-serif'
          }}>
            {error}
          </div>
        )}

        <div className="vault-options">
          {vaults.map((vault) => (
            <div 
              key={vault.id}
              className={`vault-card ${selectedVault?.id === vault.id ? 'selected' : ''}`}
              onClick={() => handleVaultSelect(vault)}
            >
              <div className="vault-icon">
                {vault.select_vault_icon ? (
                  <img src={vault.select_vault_icon} alt={vault.name} style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                ) : (
                  <i className="fas fa-vault"></i>
                )}
              </div>
              <div className="vault-content">
                <div className="vault-title">{vault.name}</div>
                <div className="vault-desc">{vault.description}</div>
              </div>
            </div>
          ))}
        </div>

        <button 
          className="btn" 
          disabled={!selectedVault || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Joining...' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default VaultSelection;
