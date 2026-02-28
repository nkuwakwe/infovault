import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faAt, faCamera, faImage } from '@fortawesome/free-solid-svg-icons';
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

    try {
      // Here you would typically send the data to your backend
      console.log('Profile data:', {
        displayName,
        username,
        bio,
        profilePicture,
        bannerImage
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Profile saved successfully!');
      // You could redirect to dashboard here
      
    } catch (error) {
      console.error('Error saving profile:', error);
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
