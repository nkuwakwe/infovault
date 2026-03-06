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

  const getUserInitials = (user) => {
    if (!user) return '?';
    const name = user.display_name || user.username || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
            <div className="dm-item">
              <div className="dm-avatar">F</div>
              <div className="dm-name">Friends</div>
            </div>

            <hr style={{borderColor:'rgba(219,176,86,0.12)', margin:'12px 16px'}} />

            <p>Direct Messages</p>
            {friends.length > 0 ? (
              friends.map((friend) => (
                <div key={friend.id} className="dm-item">
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

        {/* 3. Main Friends content area */}
        <div className="friends-content">
          <div className="friends-top">
            <h1>Friends</h1>
            <div className="tabs">
              <div 
                className={`tab ${activeTab === 'all' ? 'active' : ''}`} 
                onClick={() => setActiveTab('all')}
              >
                All
              </div>
              <div 
                className={`tab ${activeTab === 'pending' ? 'active' : ''}`} 
                onClick={() => setActiveTab('pending')}
              >
                Pending
              </div>
            </div>
            <button className="add-friend" onClick={() => setShowAddFriendModal(true)}>Add Friend</button>
          </div>

          <input className="search-friends" placeholder="Search" />

          <div className="friends-list">
            {activeTab === 'all' ? (
              <>
                <div className="section-title">All friends — {friends.length}</div>
                {friends.map((friend) => (
                  <div key={friend.id} className="friend-row">
                    <div className="friend-avatar">
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
                    <div className="friend-name">{friend.display_name || friend.username}</div>
                    <div className="friend-status">Online</div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="request-tabs">
                  <div 
                    className={`request-tab ${requestTab === 'received' ? 'active' : ''}`}
                    onClick={() => setRequestTab('received')}
                  >
                    Received Requests — {friendRequests.length}
                  </div>
                  <div 
                    className={`request-tab ${requestTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setRequestTab('sent')}
                  >
                    Sent Requests — {sentRequests.length}
                  </div>
                </div>

                {requestTab === 'received' && (
                  <div className="requests-section">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="friend-row">
                        <div className="friend-avatar">
                          {request.sender.pfp ? (
                            <img 
                              src={request.sender.pfp} 
                              alt={request.sender.display_name || request.sender.username} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                          ) : (
                            getUserInitials(request.sender)
                          )}
                        </div>
                        <div className="friend-name">{request.sender.display_name || request.sender.username}</div>
                        <div className="friend-actions">
                          <button 
                            className="accept-btn" 
                            onClick={() => respondToFriendRequest(request, 'accept')}
                            title="Accept"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button 
                            className="decline-btn" 
                            onClick={() => respondToFriendRequest(request, 'decline')}
                            title="Decline"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {requestTab === 'sent' && (
                  <div className="requests-section">
                    {sentRequests.map((request) => (
                      <div key={request.id} className="friend-row">
                        <div className="friend-avatar">
                          {request.receiver.pfp ? (
                            <img 
                              src={request.receiver.pfp} 
                              alt={request.receiver.display_name || request.receiver.username} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            />
                          ) : (
                            getUserInitials(request.receiver)
                          )}
                        </div>
                        <div className="friend-name">{request.receiver.display_name || request.receiver.username}</div>
                        <div className="friend-status">Pending</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 4. Active Now panel */}
        <div className="active-now">
          <div className="active-title">Active Now</div>
          <div className="quiet-box">
            <strong>It's quiet for now...</strong><br></br>
            When a friend starts an activity—like playing a game or hanging out in voice—we'll show it here!
          </div>
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
