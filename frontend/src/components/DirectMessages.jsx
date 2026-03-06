import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DirectMessages.css';

const DirectMessages = () => {
  const navigate = useNavigate();
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [requestTab, setRequestTab] = useState('received'); // 'sent' or 'received'
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [commonVaults, setCommonVaults] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmInput, setDmInput] = useState('');
  const [currentConversation, setCurrentConversation] = useState(null);
  const [showFriendsList, setShowFriendsList] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchFriendRequests();
    fetchSentRequests();
    fetchFriends();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchFriends();
    } else if (activeTab === 'pending') {
      fetchFriendRequests();
      fetchSentRequests();
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/friend-requests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/friend-requests/sent', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sent requests data:', data);
        setSentRequests(data.requests || []);
      } else {
        console.error('Failed to fetch sent requests:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch sent requests:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Friends data:', data); // Debug log
        setFriends(data.friends || []);
      } else {
        console.error('Failed to fetch friends:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/friend-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_username: friendUsername
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setShowAddFriendModal(false);
        setFriendUsername('');
        // Refresh data
        fetchFriendRequests();
        fetchSentRequests();
        fetchFriends();
      } else {
        alert(data.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      alert('Failed to send friend request');
    }
  };

  const respondToFriendRequest = async (request, action) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/friend-requests/${request.sender_id}/${request.receiver_id}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Refresh data
        fetchFriendRequests();
        fetchFriends();
      } else {
        alert(data.message || 'Failed to respond to friend request');
      }
    } catch (error) {
      console.error('Failed to respond to friend request:', error);
      alert('Failed to respond to friend request');
    }
  };

  const openDMChat = async (friend) => {
    setSelectedFriend(friend);
    setShowProfile(false);
    setShowFriendsList(false);
    fetchCommonVaults(friend.id);
    
    // Create or get DM conversation
    const conversation = await createOrGetDMConversation(friend.id);
    if (conversation) {
      await fetchDMMessages(conversation.id);
    }
  };

  const openProfile = (friend) => {
    setSelectedFriend(friend);
    setShowProfile(true);
    fetchCommonVaults(friend.id);
  };

  const closeDMChat = () => {
    setSelectedFriend(null);
    setShowProfile(false);
    setCommonVaults([]);
  };

  const fetchCommonVaults = async (friendId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/users/${friendId}/common-vaults`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setCommonVaults(data.commonVaults);
      } else {
        console.error('Failed to fetch common vaults:', data.message);
      }
    } catch (error) {
      console.error('Failed to fetch common vaults:', error);
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '';
    const name = user.display_name || user.username;
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // DM Messaging Functions
  const createOrGetDMConversation = async (friendId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5000/api/dm-conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participant_id: friendId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentConversation(data.conversation);
        return data.conversation;
      }
    } catch (error) {
      console.error('Failed to create/get DM conversation:', error);
    }
    return null;
  };

  const fetchDMMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:5000/api/dm-conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setDmMessages(data.messages || []);
        // Scroll to bottom after messages load
        setTimeout(() => {
          const messageHistory = document.querySelector('.dm-message-history');
          if (messageHistory) {
            messageHistory.scrollTop = messageHistory.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to fetch DM messages:', error);
    }
  };

  const sendDMMessage = async () => {
    if (!dmInput.trim() || !selectedFriend) return;
    
    try {
      const token = localStorage.getItem('access_token');
      let conversationId = currentConversation?.id;
      
      // If no conversation exists, create one and send first message
      if (!conversationId) {
        const response = await fetch('http://localhost:5000/api/dm-messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            participant_id: selectedFriend.id,
            content: dmInput.trim()
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setCurrentConversation(data.conversation);
          setDmMessages(prev => [...prev, data.message]);
          setDmInput('');
          
          // Scroll to bottom after sending
          setTimeout(() => {
            const messageHistory = document.querySelector('.dm-message-history');
            if (messageHistory) {
              messageHistory.scrollTop = messageHistory.scrollHeight;
            }
          }, 100);
        } else {
          console.error('Failed to send DM message:', data.message);
        }
      } else {
        // Send to existing conversation
        const response = await fetch('http://localhost:5000/api/dm-messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            content: dmInput.trim()
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setDmMessages(prev => [...prev, data.message]);
          setDmInput('');
          
          // Scroll to bottom after sending
          setTimeout(() => {
            const messageHistory = document.querySelector('.dm-message-history');
            if (messageHistory) {
              messageHistory.scrollTop = messageHistory.scrollHeight;
            }
          }, 100);
        } else {
          console.error('Failed to send DM message:', data.message);
        }
      }
    } catch (error) {
      console.error('Failed to send DM message:', error);
    }
  };

  const handleDMKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDMMessage();
    }
  };

  const showFriendsManagement = () => {
    setSelectedFriend(null);
    setShowProfile(false);
    setShowFriendsList(true);
    setCurrentConversation(null);
    setDmMessages([]);
    setCommonVaults([]);
  };

  return (
    <div className="dm-container">
      <div className="top-bar">Friends</div>

      <div className="main">
        {/* 1. Very narrow Vaults / Guild sidebar */}
        <div className="guilds-bar">
          <div className="guild-icon active" onClick={() => navigate('/chat')}>
            <img src="/img/dm_icon.png" alt="Direct Messages" style={{ width: '24px', height: '24px', objectFit: 'cover' }} />
          </div>
          <div className="guild-icon" onClick={() => navigate('/chat')}>
            <i className="fas fa-shopping-cart"></i>
          </div>
          <div className="guild-icon" onClick={() => navigate('/chat')}>
            <i className="fas fa-cut"></i>
          </div>
          <div className="guild-icon" onClick={() => navigate('/chat')}>
            <i className="fas fa-plus"></i>
          </div>
        </div>

        {/* 2. DMs + Friends navigation panel */}
        <div className="dm-panel">
          <div className="dm-header">Find or start a conversation</div>
          <input className="dm-search" placeholder="Search" />

          <div className="dm-list">
            <div className="dm-item" onClick={showFriendsManagement}>
              <div className="dm-avatar">F</div>
              <div className="dm-name">Friends</div>
            </div>

            <hr style={{borderColor:'rgba(219,176,86,0.12)', margin:'12px 16px'}} />

            <p>Direct Messages</p>
            {friends.length > 0 ? (
              friends.map((friend) => (
                <div key={friend.id} className="dm-item" onClick={() => openDMChat(friend)}>
                  <div className="dm-avatar">
                    {friend.pfp ? (
                      <img 
                        src={friend.pfp} 
                        alt={friend.display_name || friend.username} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      getUserInitials(friend)
                    )}
                  </div>
                  <div className="dm-name">{friend.display_name || friend.username}</div>
                </div>
              ))
            ) : (
              <div className="dm-item">
                <div className="dm-name">No friends yet</div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Middle Content Area - DM Chat or Profile */}
        <div className="middle-content">
          {showFriendsList && (
            <div className="friends-management">
              <div className="friends-header">
                <h2>Friends</h2>
                <p>Manage your friends and friend requests</p>
              </div>
              
              {/* Tabs */}
              <div className="friends-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Friends
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pending
                </button>
              </div>

              {/* Content based on active tab */}
              {activeTab === 'all' && (
                <div className="all-friends-content">
                  {friends.length > 0 ? (
                    friends.map(friend => (
                      <div key={friend.id} className="friend-item">
                        <div className="friend-avatar">
                          {friend.pfp ? (
                            <img src={friend.pfp} alt={friend.display_name || friend.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            getUserInitials(friend)
                          )}
                        </div>
                        <div className="friend-info">
                          <div className="friend-name">{friend.display_name || friend.username}</div>
                          <div className="friend-username">@{friend.username}</div>
                        </div>
                        <div className="friend-actions">
                          <button className="friend-btn message" onClick={() => openDMChat(friend)}>
                            <i className="fas fa-message"></i>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-friends">
                      <p>No friends yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="pending-content">
                  {/* Request tabs */}
                  <div className="request-tabs">
                    <button 
                      className={`request-tab-btn ${requestTab === 'received' ? 'active' : ''}`}
                      onClick={() => setRequestTab('received')}
                    >
                      Received Requests
                    </button>
                    <button 
                      className={`request-tab-btn ${requestTab === 'sent' ? 'active' : ''}`}
                      onClick={() => setRequestTab('sent')}
                    >
                      Sent Requests
                    </button>
                  </div>

                  {requestTab === 'received' && (
                    <div className="received-requests">
                      {friendRequests.length > 0 ? (
                        friendRequests.map(request => (
                          <div key={request.id} className="request-item">
                            <div className="request-avatar">
                              {request.receiver?.pfp ? (
                                <img src={request.receiver.pfp} alt={request.receiver.display_name || request.receiver.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              ) : (
                                getUserInitials(request.receiver)
                              )}
                            </div>
                            <div className="request-info">
                              <div className="request-name">{request.receiver?.display_name || request.receiver?.username}</div>
                              <div className="request-username">@{request.receiver?.username}</div>
                            </div>
                            <div className="request-actions">
                              <button className="request-btn accept" onClick={() => respondToFriendRequest(request.sender_id, request.receiver_id, 'accept')}>
                                Accept
                              </button>
                              <button className="request-btn decline" onClick={() => respondToFriendRequest(request.sender_id, request.receiver_id, 'decline')}>
                                Decline
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-requests">
                          <p>No received requests</p>
                        </div>
                      )}
                    </div>
                  )}

                  {requestTab === 'sent' && (
                    <div className="sent-requests">
                      {sentRequests.length > 0 ? (
                        sentRequests.map(request => (
                          <div key={request.id} className="request-item">
                            <div className="request-avatar">
                              {request.receiver?.pfp ? (
                                <img src={request.receiver.pfp} alt={request.receiver.display_name || request.receiver.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              ) : (
                                getUserInitials(request.receiver)
                              )}
                            </div>
                            <div className="request-info">
                              <div className="request-name">{request.receiver?.display_name || request.receiver?.username}</div>
                              <div className="request-username">@{request.receiver?.username}</div>
                            </div>
                            <div className="request-actions">
                              <button className="request-btn cancel" onClick={() => cancelFriendRequest(request.sender_id, request.receiver_id)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="no-requests">
                          <p>No sent requests</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {selectedFriend && !showProfile && (
            <div className="dm-chat">
              {/* Top bar with friend info */}
              <div className="dm-top-bar">
                <div className="dm-avatar-small">
                  {selectedFriend.pfp ? (
                    <img 
                      src={selectedFriend.pfp} 
                      alt={selectedFriend.display_name || selectedFriend.username} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    getUserInitials(selectedFriend)
                  )}
                </div>
                <div className="dm-user-info">
                  <div className="dm-username">{selectedFriend.display_name || selectedFriend.username}</div>
                  <div className="dm-status">@{selectedFriend.username}</div>
                </div>
                <div className="dm-actions">
                  <i className="fas fa-phone"></i>
                  <i className="fas fa-video"></i>
                  <i className="fas fa-user-plus"></i>
                  <i className="fas fa-ellipsis-v"></i>
                </div>
                <button className="dm-close-btn" onClick={closeDMChat}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* DM Header */}
              <div className="dm-header">
                <div className="dm-big-avatar">
                  {selectedFriend.pfp ? (
                    <img 
                      src={selectedFriend.pfp} 
                      alt={selectedFriend.display_name || selectedFriend.username} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    getUserInitials(selectedFriend)
                  )}
                </div>
                <div className="dm-display-name">{selectedFriend.display_name || selectedFriend.username}</div>
                <div className="dm-handle">@{selectedFriend.username}</div>
                <p className="dm-intro-text">
                  This is the beginning of your direct message history with {selectedFriend.display_name || selectedFriend.username}.
                </p>
                <div className="dm-buttons">
                  <button className="dm-btn dm-btn-remove">Remove Friend</button>
                  <button className="dm-btn dm-btn-block">Block</button>
                </div>
                <div className="dm-common-vaults">
                  <div className="dm-common-vaults-title">Vaults in common</div>
                  <div className="dm-common-vaults-list">
                    {commonVaults.length > 0 ? (
                      commonVaults.map((vault) => (
                        <div key={vault.id} className="dm-common-vault" title={vault.name}>
                          <div className="dm-common-vault-icon">
                            {vault.icon ? (
                              <img 
                                src={vault.icon} 
                                alt={vault.name} 
                                style={{ width: '20px', height: '20px', objectFit: 'cover' }}
                              />
                            ) : (
                              <i className="fas fa-server" style={{ fontSize: '14px', color: '#dbb056' }}></i>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="dm-no-common-vaults">No vaults in common</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div className="dm-message-history">
                {dmMessages.length > 0 ? (
                  dmMessages.map((message, index) => {
                    const isCurrentUser = message.user_id === currentUser?.id;
                    const messageUser = isCurrentUser ? currentUser : selectedFriend;
                    
                    return (
                      <div key={message.id}>
                        {index === 0 && (
                          <div className="dm-message-date">
                            {new Date(message.created_at).toLocaleDateString()}
                          </div>
                        )}
                        <div className={`dm-message ${isCurrentUser ? 'you' : 'other'}`}>
                          <div className="dm-msg-avatar">
                            {messageUser?.pfp ? (
                              <img 
                                src={messageUser.pfp} 
                                alt={messageUser.display_name || messageUser.username} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                              />
                            ) : (
                              getUserInitials(messageUser)
                            )}
                          </div>
                          <div className="dm-msg-content">
                            {!isCurrentUser && (
                              <div className="dm-msg-username">
                                {messageUser.display_name || messageUser.username}
                              </div>
                            )}
                            <div className="dm-msg-text">{message.content}</div>
                            <div className="dm-msg-timestamp">
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="dm-welcome-message">
                    <div className="dm-welcome-text">
                      This is the beginning of your direct message history with {selectedFriend.display_name || selectedFriend.username}.
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="dm-input-bar">
                <div className="dm-input-wrapper">
                  <input 
                    type="text" 
                    className="dm-message-input" 
                    placeholder={`Message @${selectedFriend.display_name || selectedFriend.username}`}
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    onKeyPress={handleDMKeyPress}
                  />
                  <div className="dm-input-icons">
                    <i className="fas fa-plus"></i>
                    <i className="fas fa-gift"></i>
                    <i className="fas fa-smile"></i>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedFriend && showProfile && (
            <div className="profile-view">
              {/* Profile Header */}
              <div className="profile-header">
                <div className="profile-banner">
                  {selectedFriend.banner ? (
                    <img 
                      src={selectedFriend.banner} 
                      alt="Profile Banner" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="profile-banner-gradient"></div>
                  )}
                </div>
                <div className="profile-avatar-wrapper">
                  <div className="profile-avatar">
                    {selectedFriend.pfp ? (
                      <img 
                        src={selectedFriend.pfp} 
                        alt={selectedFriend.display_name || selectedFriend.username} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      getUserInitials(selectedFriend)
                    )}
                    <div className="profile-status-dot"></div>
                  </div>
                </div>
                <div className="profile-top-controls">
                  <i className="fas fa-user-plus"></i>
                  <i className="fas fa-ellipsis-v"></i>
                </div>
              </div>

              {/* Profile Content */}
              <div className="profile-content">
                <h1 className="profile-display-name">{selectedFriend.display_name || selectedFriend.username}</h1>
                <div className="profile-username-row">
                  <div className="profile-username">@{selectedFriend.username}</div>
                  <div className="profile-tag">USER</div>
                </div>
                <div className="profile-bio-box">
                  <div className="profile-bio-title">Bio</div>
                  <div className="profile-bio-text">
                    {selectedFriend.bio || 'No bio available.'}
                  </div>
                </div>
                <div className="profile-member-since">
                  Member Since<br />
                  {selectedFriend.created_at ? new Date(selectedFriend.created_at).toLocaleDateString() : 'Unknown'}
                </div>
                <button className="profile-view-full-btn">View Full Profile</button>
              </div>
              <button className="profile-close-btn" onClick={closeDMChat}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {!selectedFriend && !showFriendsList && (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-comments"></i>
              </div>
              <div className="empty-title">Select a conversation</div>
              <div className="empty-text">Choose a friend from the list to start messaging</div>
            </div>
          )}
        </div>

        {/* 4. Right panel - Profile or Active Now */}
        <div className="active-now">
          {selectedFriend ? (
            <div className="profile-view">
              {/* Profile Header */}
              <div className="profile-header">
                <div className="profile-avatar-wrapper">
                  
                  <div className="profile-avatar">
                    {selectedFriend.pfp ? (
                      <img 
                        src={selectedFriend.pfp} 
                        alt={selectedFriend.display_name || selectedFriend.username} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      getUserInitials(selectedFriend)
                    )}
                    <div className="profile-status-dot"></div>
                  </div>
                </div>
                <div className="profile-top-controls">
                  <i className="fas fa-user-plus"></i>
                  <i className="fas fa-ellipsis-v"></i>
                </div>
              </div>

              {/* Profile Content */}
              <div className="profile-content">
                <h1 className="profile-display-name">{selectedFriend.display_name || selectedFriend.username}</h1>
                <div className="profile-username-row">
                  <div className="profile-username">@{selectedFriend.username}</div>
                  <div className="profile-tag">USER</div>
                </div>
                <div className="profile-bio-box">
                  <div className="profile-bio-title">Bio</div>
                  <div className="profile-bio-text">
                    {selectedFriend.bio || 'No bio available.'}
                  </div>
                </div>
                <div className="profile-member-since">
                  Member Since<br />
                  {selectedFriend.created_at ? new Date(selectedFriend.created_at).toLocaleDateString() : 'Unknown'}
                </div>
                <button className="profile-view-full-btn">View Full Profile</button>
              </div>
            </div>
          ) : (
            <>
              <div className="active-title">Active Now</div>
              <div className="quiet-box">
                <strong>It's quiet for now...</strong><br></br>
                When a friend starts an activity—like playing a game or hanging out in voice—we'll show it here!
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Bottom user bar */}
      <div className="bottom-bar">
        <div className="user-left">
          <div className="user-avatar">
            {currentUser?.pfp ? (
              <img 
                src={currentUser.pfp} 
                alt={currentUser.display_name || currentUser.username} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              getUserInitials(currentUser)
            )}
            <div className="status-dot"></div>
          </div>
          <div>
            {currentUser?.display_name || currentUser?.username || 'User'} 
            <span style={{color:'#23a55a', fontSize:'12px'}}> • Online</span>
          </div>
        </div>
        <div className="controls">
          <i className="fas fa-microphone-slash"></i>
          <i className="fas fa-headphones"></i>
          <i className="fas fa-cog"></i>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <>
          <div className="modal-backdrop active" onClick={() => setShowAddFriendModal(false)}></div>
          <div className="add-friend-modal">
            <div className="add-friend-container active">
              <div className="emoji">🧙‍♂️</div>

              <h1>Add Friend</h1>
              <div className="subtitle">Add friends with their Infovault username</div>

              <p className="description">
                You can add friends with their Infovault username.
              </p>

              <div className="input-wrapper">
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Enter Infovault username"
                  value={friendUsername}
                  onChange={(e) => setFriendUsername(e.target.value)}
                />
              </div>

              <button 
                className="send-button"
                onClick={sendFriendRequest}
              >
                Request to talk
              </button>

              <button 
                className="back-link" 
                onClick={() => setShowAddFriendModal(false)}
              >
                ← Back to Friends
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DirectMessages;
