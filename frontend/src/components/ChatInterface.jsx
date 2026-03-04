import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatInterface.css';

const ChatInterface = () => {
  const [vaults, setVaults] = useState([]);
  const [userVaults, setUserVaults] = useState([]);
  const [currentVault, setCurrentVault] = useState(null);
  const [chats, setChats] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
    fetchUserVaults();
  }, []);

  useEffect(() => {
    if (currentVault) {
      fetchVaultChats();
      fetchVaultMembers();
    }
  }, [currentVault]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchUserVaults = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/vaults/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setUserVaults(data.vaults || []);
        if (data.vaults && data.vaults.length > 0) {
          setCurrentVault(data.vaults[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user vaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVaultChats = async () => {
    if (!currentVault) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/vaults/${currentVault.id}/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log('Categories and chats data:', data);
        setChats(data.categories || []);
        
        // Select first chat from first category by default
        if (data.categories && data.categories.length > 0) {
          const firstCategory = data.categories[0];
          if (firstCategory.chats && firstCategory.chats.length > 0) {
            setSelectedChat(firstCategory.chats[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch vault chats:', error);
    }
  };

  const fetchVaultMembers = async () => {
    if (!currentVault) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/vaults/${currentVault.id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch vault members:', error);
    }
  };

  const switchVault = (vault) => {
    setCurrentVault(vault);
    setSelectedChat(null);
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    if (user.display_name) {
      return user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username ? user.username.slice(0, 2).toUpperCase() : '?';
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="chat-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="server-name">
          {currentVault ? `Infovault – ${currentVault.name}` : 'Infovault'}
        </div>
      </div>

      <div className="main-layout">
        {/* Server Icons Column */}
        <div className="servers-column">
          {/* Direct Messages */}
          <div className="server-icon" onClick={() => navigate('/dm')}>
            <i className="fas fa-comment-dots"></i>
          </div>
          
          {/* User's Vaults */}
          {userVaults.map((vault) => (
            <div 
              key={vault.id}
              className={`server-icon ${currentVault?.id === vault.id ? 'active' : ''}`}
              onClick={() => switchVault(vault)}
            >
              {vault.icon ? (
                <img src={vault.icon} alt={vault.name} style={{ width: '24px', height: '24px', objectFit: 'cover' }} />
              ) : (
                <i className="fas fa-vault"></i>
              )}
            </div>
          ))}
          
          <div className="server-icon add-server">+</div>
        </div>

        {/* Channels Sidebar */}
        <div className="channels-sidebar">
          {currentVault && (
            <>
              <div className="server-header">
                <div className="server-title">{currentVault.name}</div>
              </div>
              
              {chats.map((category) => (
                <div key={category.id}>
                  <div className="category">{category.name.toUpperCase()}</div>
                  {category.chats && category.chats.map((chat) => (
                    <div 
                      key={chat.id}
                      className={`channel-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                      onClick={() => selectChat(chat)}
                    >
                      <div className="pill-indicator"></div>
                      <span className="hashtag">#</span>
                      {chat.icon && (
                        <img src={chat.icon} alt={chat.name} className="channel-icon" />
                      )}
                      <span className="channel-name">{chat.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="chat-area">
          <div className="chat-messages">
            {selectedChat ? (
              <div className="welcome-message">
                <h3>Welcome to #{selectedChat.name}</h3>
                <p>This is the beginning of the #{selectedChat.name} channel.</p>
              </div>
            ) : (
              <div className="welcome-message">
                <h3>Select a channel to start chatting</h3>
              </div>
            )}
          </div>

          <div className="input-bar">
            <input 
              type="text" 
              placeholder={selectedChat ? `Message #${selectedChat.name}` : "Select a channel..."}
              disabled={!selectedChat}
            />
            <div className="input-icons">
              <i className="fas fa-plus"></i>
              <i className="fas fa-gift"></i>
              <i className="fas fa-image"></i>
            </div>
          </div>
        </div>

        {/* Members Sidebar */}
        <div className="members-sidebar">
          <div className="members-title">Members — {members.length}</div>
          {members.map((member) => (
            <div key={member.id} className="member">
              <div className="status-dot"></div>
              {member.display_name || member.username}
            </div>
          ))}
        </div>

        {/* Bottom Left User Panel */}
        <div className="bottom-panel">
          <div className="user-info">
            <div className="user-avatar-small">
              {getUserInitials(currentUser)}
              <div className="status-dot-small"></div>
            </div>
            <div className="user-name-role">
              <div className="username-text">{currentUser?.display_name || 'User'}</div>
              <div className="role-text">@{currentUser?.username || 'username'}</div>
            </div>
          </div>
          <div className="user-controls">
            <i className="fas fa-microphone muted"></i>
            <i className="fas fa-headphones"></i>
            <i className="fas fa-cog"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
