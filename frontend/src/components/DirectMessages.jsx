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
  const [replyingTo, setReplyingTo] = useState(null); // { id, content, user }
  const [showReplyMenu, setShowReplyMenu] = useState(null); // message id
  const [editingMessage, setEditingMessage] = useState(null); // { id, content, originalContent }
  const [editInput, setEditInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(null); // message id
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // message id
  const [showVaultBrowser, setShowVaultBrowser] = useState(false);
  const [availableVaults, setAvailableVaults] = useState([]);
  const [userVaults, setUserVaults] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set()); // Store typing user IDs
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [typingPollInterval, setTypingPollInterval] = useState(null);

  // Typing indicator functions
  const handleTypingStart = () => {
    if (!selectedFriend || !currentConversation) return;
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Send typing event
    sendTypingEvent(true);
    
    // Set timeout to stop typing indicator after 3 seconds
    const timeout = setTimeout(() => {
      sendTypingEvent(false);
    }, 3000);
    
    setTypingTimeout(timeout);
  };

  const sendTypingEvent = async (isTyping) => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('Sending typing event:', { isTyping, conversationId: currentConversation?.id });
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm/typing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          is_typing: isTyping
        })
      });
      
      const result = await response.json();
      console.log('Typing event response:', result);
    } catch (error) {
      console.error('Failed to send typing event:', error);
    }
  };

  const handleTypingStop = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    sendTypingEvent(false);
  };

  // Poll for typing indicators
  const fetchTypingIndicators = async () => {
    if (!currentConversation) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm/typing/${currentConversation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current user from typing users
        const otherTypingUsers = data.typing_users.filter(user => user.user_id !== currentUser?.id);
        setTypingUsers(new Set(otherTypingUsers));
      }
    } catch (error) {
      console.error('Failed to fetch typing indicators:', error);
    }
  };

  // Start/stop polling when conversation changes
  useEffect(() => {
    if (currentConversation) {
      // Start polling every 2 seconds
      const interval = setInterval(fetchTypingIndicators, 2000);
      setTypingPollInterval(interval);
      
      // Initial fetch
      fetchTypingIndicators();
    } else {
      // Stop polling
      if (typingPollInterval) {
        clearInterval(typingPollInterval);
        setTypingPollInterval(null);
      }
      setTypingUsers(new Set());
    }
    
    return () => {
      if (typingPollInterval) {
        clearInterval(typingPollInterval);
      }
    };
  }, [currentConversation, currentUser]);

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

  useEffect(() => {
    fetchUserVaults();
  }, []);

  const fetchAvailableVaults = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vaults/public`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setAvailableVaults(data.vaults || []);
      }
    } catch (error) {
      console.error('Failed to fetch available vaults:', error);
    }
  };

  const fetchUserVaults = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vaults/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setUserVaults(data.vaults || []);
      }
    } catch (error) {
      console.error('Failed to fetch user vaults:', error);
    }
  };

  const joinVault = async (vaultId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/vaults/${vaultId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchUserVaults(); // Refresh user vaults
        setShowVaultBrowser(false);
      } else {
        console.error('Failed to join vault:', data.message);
      }
    } catch (error) {
      console.error('Failed to join vault:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/user/profile`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friend-requests`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friend-requests/sent`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friends`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friend-requests`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/friend-requests/${request.sender_id}/${request.receiver_id}/respond`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${friendId}/common-vaults`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-conversations`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-conversations/${conversationId}/messages`, {
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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            participant_id: selectedFriend.id,
            content: dmInput.trim(),
            reply_to_id: replyingTo?.id || null
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setCurrentConversation(data.conversation);
          setDmMessages(prev => [...prev, data.message]);
          setDmInput('');
          setReplyingTo(null); // Clear reply state
          
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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            content: dmInput.trim(),
            reply_to_id: replyingTo?.id || null
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setDmMessages(prev => [...prev, data.message]);
          setDmInput('');
          setReplyingTo(null); // Clear reply state
          
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
      if (showFileUpload && selectedFile) {
        // If file is selected, send based on input content
        if (dmInput.trim()) {
          // Send message with attachment
          sendDMWithFile();
        } else {
          // Send file alone
          sendDMFileAlone();
        }
      } else {
        // Regular DM send
        sendDMMessage();
      }
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
    document.querySelector('.dm-input-bar input')?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
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
    document.querySelector('.dm-input-bar input')?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditInput('');
  };

  const saveEdit = async () => {
    if (!editingMessage || !editInput.trim()) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-messages/${editingMessage.id}`, {
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
        setDmMessages(prev => prev.map(msg => 
          msg.id === editingMessage.id 
            ? { ...data.message, is_edited: true, edited_at: new Date().toISOString() }
            : msg
        ));
        setEditingMessage(null);
        setEditInput('');
      } else {
        console.error('Failed to edit DM message:', data.message);
      }
    } catch (error) {
      console.error('Failed to edit DM message:', error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setShowFileUpload(true);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setShowFileUpload(false);
  };

  const sendDMWithFile = async () => {
    if (!selectedFile || !currentConversation) return;
    
    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('conversation_id', currentConversation.id);
      
      const token = localStorage.getItem('access_token');
      const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/dm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      if (uploadResponse.ok) {
        // Send DM with attachment
        const messageResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversation_id: currentConversation.id,
            content: dmInput.trim(),
            reply_to_id: replyingTo?.id || null,
            attachment: uploadData.attachment
          })
        });
        
        const messageData = await messageResponse.json();
        if (messageResponse.ok) {
          setDmMessages(prev => [...prev, messageData.message]);
          setDmInput('');
          setReplyingTo(null);
          removeFile();
        } else {
          console.error('Failed to send DM with file:', messageData.message);
        }
      } else {
        console.error('Failed to upload DM file:', uploadData.message);
      }
    } catch (error) {
      console.error('Failed to send DM with file:', error);
    }
  };

  const sendDMFileAlone = async () => {
    if (!selectedFile || !currentConversation) return;
    
    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('conversation_id', currentConversation.id);
      
      const token = localStorage.getItem('access_token');
      const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/dm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      if (uploadResponse.ok) {
        // Send DM with null content and attachment
        const messageResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversation_id: currentConversation.id,
            content: null,
            reply_to_id: replyingTo?.id || null,
            attachment: uploadData.attachment
          })
        });
        
        const messageData = await messageResponse.json();
        if (messageResponse.ok) {
          setDmMessages(prev => [...prev, messageData.message]);
          setReplyingTo(null);
          removeFile();
        } else {
          console.error('Failed to send DM file alone:', messageData.message);
        }
      } else {
        console.error('Failed to upload DM file:', uploadData.message);
      }
    } catch (error) {
      console.error('Failed to send DM file alone:', error);
    }
  };

  const handleContextMenu = (e, messageId) => {
    e.preventDefault();
    console.log('DM Context menu triggered for message:', messageId);
    setShowReplyMenu(messageId);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.reply-menu') && !e.target.closest('.dm-message') && !e.target.closest('.emoji-picker')) {
      setShowReplyMenu(null);
      setShowReactionMenu(null);
      setShowEmojiPicker(null);
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

  const showFriendsManagement = () => {
    setSelectedFriend(null);
    setShowProfile(false);
    setShowFriendsList(true);
    setCurrentConversation(null);
    setDmMessages([]);
    setCommonVaults([]);
  };

  const handleReaction = (messageId, emoji) => {
    addDMReaction(messageId, emoji);
    setShowEmojiPicker(null);
  };

  const addDMReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emoji: emoji
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Update message in local state
        setDmMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      } else {
        console.error('Failed to add DM reaction:', data.message);
      }
    } catch (error) {
      console.error('Failed to add DM reaction:', error);
    }
  };

  const removeDMReaction = async (messageId, emoji) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dm-messages/${messageId}/reactions`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emoji: emoji
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        // Update message in local state
        setDmMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      } else {
        console.error('Failed to remove DM reaction:', data.message);
      }
    } catch (error) {
      console.error('Failed to remove DM reaction:', error);
    }
  };

  const toggleDMReaction = (messageId, emoji) => {
    const message = dmMessages.find(msg => msg.id === messageId);
    if (message?.reactions?.[emoji]?.includes(currentUser?.id)) {
      removeDMReaction(messageId, emoji);
    } else {
      addDMReaction(messageId, emoji);
    }
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
          {userVaults.map((vault) => (
            <div 
              key={vault.id} 
              className="guild-icon" 
              onClick={() => navigate(`/chat?vault=${vault.id}`)}
              title={vault.name}
            >
              {vault.icon ? (
                <img 
                  src={vault.icon} 
                  alt={vault.name} 
                  style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#dbb056',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}>
                  {vault.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
          <div className="guild-icon" onClick={() => {
            fetchAvailableVaults();
            setShowVaultBrowser(true);
          }}>
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
                        <div className={`dm-message ${isCurrentUser ? 'you' : 'other'}`} data-message-id={message.id} onContextMenu={(e) => handleContextMenu(e, message.id)}>
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
                            <div className="dm-msg-text">
                            {message.content && <div>{message.content}</div>}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="message-attachments">
                                {message.attachments.map((attachment, index) => (
                                  <div key={index} className="attachment">
                                    {attachment.type === 'image' ? (
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name} 
                                        className="attachment-image"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                      />
                                    ) : (
                                      <div className="file-attachment" onClick={() => window.open(attachment.url, '_blank')}>
                                        <i className="fas fa-file"></i>
                                        <span className="attachment-name">{attachment.name}</span>
                                        <span className="attachment-size">
                                          {(attachment.size / 1024).toFixed(1)}KB
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                            <div className="dm-msg-timestamp">
                              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {message.is_edited && (
                                <span className="edited-indicator">(Edited)</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Reactions */}
                          {message.reactions && Object.keys(message.reactions).length > 0 && (
                            <div className="message-reactions">
                              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                                <button 
                                  key={emoji} 
                                  className={`reaction ${userIds.includes(currentUser?.id) ? 'reacted' : ''}`}
                                  onClick={() => toggleDMReaction(message.id, emoji)}
                                >
                                  <span className="reaction-emoji">{emoji}</span>
                                  <span className="reaction-count">{userIds.length}</span>
                                </button>
                              ))}
                              <button 
                                className="reaction-add-btn"
                                onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                            </div>
                          )}
                          
                          {/* Emoji Picker */}
                          {showEmojiPicker === message.id && (
                            <div className="emoji-picker">
                              <div className="emoji-grid">
                                {['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥', '💰', '🎉', '👏', '🙏', '💯', '🤔', '👀', '🎯', '🚀', '💎', '⭐', '🌟'].map((emoji) => (
                                  <button 
                                    key={emoji}
                                    className="emoji-btn"
                                    onClick={() => handleReaction(message.id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Reply menu */}
                          {showReplyMenu === message.id && (
                            <div className="reply-menu">
                              <button onClick={() => handleReply(message)} className="reply-btn">
                                <i className="fas fa-reply"></i> Reply
                              </button>
                              <button onClick={(e) => {
                                e.stopPropagation();
                                setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id);
                                setShowReplyMenu(null);
                              }} className="reaction-btn">
                                <i className="fas fa-smile"></i> React
                              </button>
                              {message.user_id === currentUser?.id && (
                                <button onClick={() => handleEdit(message)} className="edit-btn">
                                  <i className="fas fa-edit"></i> Edit
                                </button>
                              )}
                            </div>
                          )}
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

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="typing-text">
                    {Array.from(typingUsers).length === 1 
                      ? `${Array.from(typingUsers)[0].display_name || Array.from(typingUsers)[0].username} is typing...`
                      : `${Array.from(typingUsers).length} people are typing...`
                    }
                  </span>
                </div>
              )}

              {/* Message Input */}
              <div className="dm-input-bar">
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
                
                {/* File upload preview */}
                {showFileUpload && (
                  <div className="file-upload-preview">
                    <div className="file-preview-content">
                      {selectedFile?.type.startsWith('image/') ? (
                        <img src={filePreview} alt="Preview" className="preview-image" />
                      ) : (
                        <div className="preview-file">
                          <i className="fas fa-file"></i>
                          <span className="file-name">{selectedFile.name}</span>
                        </div>
                      )}
                      <button className="remove-file-btn" onClick={removeFile}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="dm-input-wrapper">
                  <input 
                    type="text" 
                    className="dm-message-input"
                    placeholder={editingMessage ? "Edit message..." : `Message @${selectedFriend.display_name || selectedFriend.username}`}
                    value={editingMessage ? editInput : dmInput}
                    onChange={(e) => {
                      if (editingMessage) {
                        setEditInput(e.target.value);
                      } else {
                        setDmInput(e.target.value);
                        handleTypingStart();
                      }
                    }}
                    onKeyPress={editingMessage ? (e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEdit();
                      }
                    } : (e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendDMMessage();
                        handleTypingStop();
                      }
                    }}
                    onBlur={() => {
                      if (!editingMessage) {
                        handleTypingStop();
                      }
                    }}
                  />
                  <div className="dm-input-icons">
                    <input 
                      type="file" 
                      id="dm-file-upload" 
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                    <label htmlFor="dm-file-upload" className="file-upload-label">
                      <i className="fas fa-plus"></i>
                    </label>
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
                {selectedFriend.banner ? (
                    <img 
                      src={selectedFriend.banner} 
                      alt="Profile Banner" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="profile-banner-gradient"></div>
                  )}
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

      {/* Vault Browser Modal */}
      {showVaultBrowser && (
        <>
          <div className="modal-backdrop active" onClick={() => setShowVaultBrowser(false)}></div>
          <div className="vault-browser-modal">
            <div className="vault-browser-container">
              <div className="vault-browser-header">
                <h2>Join a Vault</h2>
                <button className="close-btn" onClick={() => setShowVaultBrowser(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="vault-list">
                {availableVaults.length > 0 ? (
                  availableVaults.map((vault) => (
                    <div key={vault.id} className="vault-item">
                      <div className="vault-info">
                        <div className="vault-icon">
                          {vault.icon ? (
                            <img 
                              src={vault.icon} 
                              alt={vault.name} 
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px' }}
                            />
                          ) : (
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              background: '#dbb056',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#000',
                              fontWeight: 'bold',
                              fontSize: '16px'
                            }}>
                              {vault.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="vault-details">
                          <div className="vault-name">{vault.name}</div>
                          <div className="vault-description">{vault.description || 'No description'}</div>
                          <div className="vault-members">{vault.member_count || 0} members</div>
                        </div>
                      </div>
                      <button 
                        className="join-vault-btn"
                        onClick={() => joinVault(vault.id)}
                      >
                        Join
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="no-vaults">
                    <i className="fas fa-lock"></i>
                    <p>No public vaults available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DirectMessages;
