import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faAt, faCamera, faImage } from '@fortawesome/free-solid-svg-icons';
import { api } from '../services/api';
import './Profile.css';

const Profile = () => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const profileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'profile') {
        setProfilePicture(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setBannerImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setBannerPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('displayName', displayName);
      formData.append('username', username);
      formData.append('bio', bio);
      
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }
      
      if (bannerImage) {
        formData.append('bannerImage', bannerImage);
      }

      const result = await api.completeProfile(formData);
      console.log('Profile updated successfully:', result);
      
      // You could redirect to dashboard here
      alert('Profile saved successfully!');
      
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="frame">
      <div className="logo">
        <img src="/img/logo.png" alt="InfoVault Logo" />
      </div>

      <div className="card">
        <div className="title">Let's personalize your vault</div>
        <div className="subtitle">Tell us a bit about you</div>

        <form onSubmit={handleSubmit} className="profile-form">
          {error && (
            <div style={{ 
              color: '#ff6b6b', 
              fontSize: '14px', 
              textAlign: 'center',
              marginBottom: '20px',
              fontFamily: 'Poppins, sans-serif'
            }}>
              {error}
            </div>
          )}

          <div className="field-label">What should we call you?</div>
          <div className="input-container">
            <FontAwesomeIcon icon={faUser} className="input-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Nelson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="field-label">Username</div>
          <div className="input-container">
            <FontAwesomeIcon icon={faAt} className="input-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="ijustgotpaid"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field-label">Description / Bio</div>
          <div className="input-container" style={{ height: 'auto', padding: 0 }}>
            <textarea
              className="input-field"
              rows="4"
              placeholder="Tell others about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="field-label">Profile Picture</div>
          <label className="file-input-container">
            <FontAwesomeIcon icon={faCamera} className="input-icon" />
            <span>{profilePicture ? profilePicture.name : 'Choose profile picture…'}</span>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'profile')}
            />
          </label>
          
          {profilePreview && (
            <div className="image-preview">
              <img src={profilePreview} alt="Profile preview" className="preview-img" />
              <button 
                type="button" 
                className="remove-preview"
                onClick={() => {
                  setProfilePreview(null);
                  setProfilePicture(null);
                  if (profileInputRef.current) profileInputRef.current.value = '';
                }}
              >
                Remove
              </button>
            </div>
          )}

          <div className="field-label">Banner Image</div>
          <label className="file-input-container">
            <FontAwesomeIcon icon={faImage} className="input-icon" />
            <span>{bannerImage ? bannerImage.name : 'Choose banner image…'}</span>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'banner')}
            />
          </label>
          
          {bannerPreview && (
            <div className="image-preview">
              <img src={bannerPreview} alt="Banner preview" className="preview-img banner-preview" />
              <button 
                type="button" 
                className="remove-preview"
                onClick={() => {
                  setBannerPreview(null);
                  setBannerImage(null);
                  if (bannerInputRef.current) bannerInputRef.current.value = '';
                }}
              >
                Remove
              </button>
            </div>
          )}

          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
