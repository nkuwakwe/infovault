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
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [profileModal, setProfileModal] = useState({ isOpen: false, user: null });
  const [directMessage, setDirectMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, content, user }
  const [showReplyMenu, setShowReplyMenu] = useState(null); // message id
  const [editingMessage, setEditingMessage] = useState(null); // { id, content, originalContent }
  const [editInput, setEditInput] = useState('');
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

  useEffect(() => {
    if (selectedChat) {
      fetchMessages();
    }
  }, [selectedChat]);

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

  const fetchMessages = async () => {
    if (!selectedChat) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/chats/${selectedChat.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: selectedChat.id,
          content: messageInput.trim(),
          reply_to_id: replyingTo?.id || null
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Add message to local state immediately for better UX
        setMessages(prev => [...prev, data.message]);
        setMessageInput('');
        setReplyingTo(null); // Clear reply state
      } else {
        console.error('Failed to send message:', data.message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const openProfileModal = async (user) => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch user's full profile and vault role
      const response = await fetch(`http://localhost:5000/api/users/${user.id}/profile?vault_id=${currentVault.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setProfileModal({ isOpen: true, user: data.user });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const closeProfileModal = () => {
    setProfileModal({ isOpen: false, user: null });
    setDirectMessage('');
  };

  const sendDirectMessage = async () => {
    if (!directMessage.trim() || !profileModal.user) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/direct-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: profileModal.user.id,
          content: directMessage.trim()
        })
      });
      
      if (response.ok) {
        setDirectMessage('');
        // Show success message or handle as needed
      }
    } catch (error) {
      console.error('Failed to send direct message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReply = (message) => {
    setReplyingTo({
      id: message.id,
      content: message.content,
      user: message.users
    });
    setShowReplyMenu(null);
    // Focus the input
    document.querySelector('.input-bar input')?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleContextMenu = (e, messageId) => {
    e.preventDefault();
    console.log('Context menu triggered for message:', messageId);
    setShowReplyMenu(messageId);
  };

  const handleEdit = (message) => {
    setEditingMessage({
      id: message.id,
      content: message.content,
      originalContent: message.content
    });
    setEditInput(message.content);
    setShowReplyMenu(null);
    // Focus the input
    document.querySelector('.input-bar input')?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditInput('');
  };

  const saveEdit = async () => {
    if (!editingMessage || !editInput.trim()) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: editInput.trim()
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Update message in local state
        setMessages(prev => prev.map(msg => 
          msg.id === editingMessage.id 
            ? { ...data.message, is_edited: true, edited_at: new Date().toISOString() }
            : msg
        ));
        setEditingMessage(null);
        setEditInput('');
      } else {
        console.error('Failed to edit message:', data.message);
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.reply-menu') && !e.target.closest('.message')) {
      setShowReplyMenu(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Position menu when it appears
  useEffect(() => {
    if (showReplyMenu) {
      const menu = document.querySelector('.reply-menu');
      if (menu) {
        // Get the message element
        const messageElement = document.querySelector(`[data-message-id="${showReplyMenu}"]`);
        if (messageElement) {
          const rect = messageElement.getBoundingClientRect();
          menu.style.left = `${rect.left}px`;
          menu.style.top = `${rect.bottom + 5}px`;
        }
      }
    }
  }, [showReplyMenu]);

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
            <img src="/img/dm_icon.png" alt="Direct Messages" style={{ width: '24px', height: '24px', objectFit: 'cover' }} />
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
            {messages.map((message) => (
              <div key={message.id} className="message" data-message-id={message.id} onContextMenu={(e) => handleContextMenu(e, message.id)}>
                {/* Reply preview */}
                {message.reply_to_id && message.reply_to && (
                  <div className="reply-preview">
                    <div className="reply-info">
                      <div className="reply-avatar">
                        {message.reply_to.users?.pfp ? (
                          <img 
                            src={message.reply_to.users.pfp} 
                            alt={message.reply_to.users.display_name || message.reply_to.users.username} 
                            className="reply-avatar-img"
                          />
                        ) : (
                          getUserInitials(message.reply_to.users)
                        )}
                      </div>
                      <div className="reply-details">
                        <div className="reply-username">
                          Replying to {message.reply_to.users?.display_name || message.reply_to.users?.username}
                        </div>
                        <div className="reply-content">{message.reply_to.content}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="avatar" onClick={() => openProfileModal(message.users)} style={{ cursor: 'pointer' }}>
                  {message.users?.pfp ? (
                    <img 
                      src={message.users.pfp} 
                      alt={message.users.display_name || message.users.username} 
                      className="user-avatar-img"
                    />
                  ) : (
                    getUserInitials({ display_name: message.users?.display_name, username: message.users?.username })
                  )}
                </div>
                <div className="msg-content">
                  <span className="username">{message.users?.display_name || message.users?.username}</span>
                  <span className="timestamp">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {message.is_edited && (
                    <span className="edited-indicator">(Edited)</span>
                  )}
                  <div className="text">{message.content}</div>
                </div>
                
                {/* Reply menu */}
                {showReplyMenu === message.id && (
                  <div className="reply-menu">
                    <button onClick={() => handleReply(message)} className="reply-btn">
                      <i className="fas fa-reply"></i> Reply
                    </button>
                    {message.user_id === currentUser?.id && (
                      <button onClick={() => handleEdit(message)} className="edit-btn">
                        <i className="fas fa-edit"></i> Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="welcome-message">
                <h3>Welcome to #{selectedChat?.name}</h3>
                <p>This is the beginning of the #{selectedChat?.name} channel.</p>
              </div>
            )}
          </div>

          <div className="input-bar">
            {/* Reply indicator */}
            {replyingTo && (
              <div className="reply-indicator">
                <div className="reply-info">
                  <span className="replying-to">Replying to {replyingTo.user?.display_name || replyingTo.user?.username}</span>
                  <button className="cancel-reply-btn" onClick={cancelReply}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            )}
            
            {/* Edit indicator */}
            {editingMessage && (
              <div className="edit-indicator">
                <div className="edit-info">
                  <span className="editing-text">Editing message</span>
                  <button className="cancel-edit-btn" onClick={cancelEdit}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            )}
            
            <input 
              type="text" 
              placeholder={editingMessage ? "Edit message..." : (selectedChat ? `Message #${selectedChat.name}` : "Select a channel...")}
              disabled={!selectedChat}
              value={editingMessage ? editInput : messageInput}
              onChange={(e) => editingMessage ? setEditInput(e.target.value) : setMessageInput(e.target.value)}
              onKeyPress={editingMessage ? (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEdit();
                }
              } : handleKeyPress}
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
              <div className="member-avatar">
                {member.pfp ? (
                  <img 
                    src={member.pfp} 
                    alt={member.display_name || member.username} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  getUserInitials(member)
                )}
              </div>
              <div className="member-info">
                <div className="member-name">{member.display_name || member.username}</div>
                <div className="member-role">{member.vault_role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Left User Panel */}
        <div className="bottom-panel">
          <div className="user-info">
            <div className="user-avatar-small">
              {currentUser?.pfp ? (
                <img 
                  src={currentUser.pfp} 
                  alt={currentUser.display_name || 'User'} 
                  className="user-avatar-img"
                />
              ) : (
                getUserInitials(currentUser)
              )}
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

      {/* Profile Modal */}
      {profileModal.isOpen && profileModal.user && (
        <>
          <div className="modal-backdrop active" onClick={closeProfileModal}></div>
          <div className="profile-modal">
            <div className="modal-content active">
              <button className="close-btn" onClick={closeProfileModal}>
                <i className="fas fa-times"></i>
              </button>

              {/* Banner + Avatar */}
              <div className="profile-banner-container">
                {profileModal.user.banner ? (
                  <img 
                    className="profile-banner" 
                    src={profileModal.user.banner} 
                    alt="Profile Banner"
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #1a1208, #0f0803)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))'
                    }}></div>
                  </div>
                )}
                <div className="banner-overlay"></div>

                <div className="profile-avatar-large">
                  {profileModal.user.pfp ? (
                    <img 
                      src={profileModal.user.pfp} 
                      alt="User Avatar" 
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#33261c',
                      color: '#dbb056',
                      fontSize: '32px',
                      fontWeight: '600'
                    }}>
                      {getUserInitials(profileModal.user)}
                    </div>
                  )}
                  <div className="status-dot-large"></div>
                </div>
              </div>

              {/* Main content */}
              <div className="profile-content">
                <div className="profile-info">
                  <h2>{profileModal.user.display_name || profileModal.user.username}</h2>
                  <p className="username">@{profileModal.user.username}</p>
                  <div className="badges">
                    {profileModal.user.vault_role && (
                      <span className="badge gold">{profileModal.user.vault_role}</span>
                    )}
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Role in Vault</h3>
                  <p>{profileModal.user.vault_role || 'Member'}</p>
                </div>

                <div className="profile-section">
                  <h3>About</h3>
                  <p>{profileModal.user.bio || 'No bio available'}</p>
                </div>

                <div className="profile-section message-box">
                  <h3>Send Direct Message</h3>
                  <div className="message-input-container">
                    <input 
                      type="text" 
                      value={directMessage}
                      onChange={(e) => setDirectMessage(e.target.value)}
                      placeholder={`Message @${profileModal.user.username}`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          sendDirectMessage();
                        }
                      }}
                    />
                    <button className="send-btn" onClick={sendDirectMessage}>
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatInterface;
