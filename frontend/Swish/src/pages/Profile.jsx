import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';
import { getErrorMessage } from '../utils/getErrorMessage';

const ShowProfile = () => {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [postCount, setPostCount] = useState(0);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:3000/profile', { withCredentials: true });
      setProfile(res.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile) return;
    axios.get('http://localhost:3000/post', { withCredentials: true })
      .then((res) => {
        const count = res.data.filter((p) => p.authorId === profile._id).length;
        setPostCount(count);
      })
      .catch((err) => {
        console.error('Error fetching post count:', err);
        showToast(getErrorMessage(err), 'error');
      });
  }, [profile]);

  const openModal = () => {
    if (!profile) return;
    setFullName(profile.fullname || profile.fullName || '');
    setDepartment(profile.department || '');
    setYear(profile.year ? String(profile.year) : '');
    setBio(profile.bio || '');
    setProfilePhoto(profile.profilePhoto || '');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast('Please choose an image smaller than 1MB', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    if (!profile) return;

    const updates = { fullname: fullName, bio, profilePhoto };
    if (profile.role === 'Student') updates.year = year;
    if (profile.role === 'Faculty') updates.department = department;

    try {
      await axios.patch('http://localhost:3000/profile/update', updates, { withCredentials: true });
      await fetchProfile();
      closeModal();
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return <div className="profile-container"><p>Loading profile...</p></div>;
  }

  if (!profile) {
    return <div className="profile-container"><p>Failed to load profile. Please log in again.</p></div>;
  }

  const displayName = profile.fullname || profile.fullName || 'User';

  return (
    <div className="profile-container">
      {toast.message && (
        <div className={`profile-toast ${toast.type === 'error' ? 'profile-toast-error' : 'profile-toast-success'}`}>
          {toast.message}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-avatar-wrap">
          {profile.profilePhoto ? (
            <img src={profile.profilePhoto} alt="Profile" className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h2>{displayName}</h2>

        <div className="profile-details">
          <p><strong>Role</strong><span>{profile.role || '—'}</span></p>

          {profile.role === 'Student' && (
            <>
              <p><strong>Department</strong><span>{profile.department || '—'}</span></p>
              <p><strong>Year</strong><span>{profile.year ? `${profile.year} Year` : '—'}</span></p>
            </>
          )}

          {profile.role === 'Faculty' && (
            <p><strong>Department</strong><span>{profile.department || '—'}</span></p>
          )}

          <p><strong>Bio</strong><span>{profile.bio || 'No bio added yet.'}</span></p>
        </div>

        <p className="profile-stats">
          Followers: {profile.followerCount || 0} &nbsp;|&nbsp; Following: {profile.followingCount || 0}
        </p>

        <button type="button" className="my-posts-link" onClick={() => nav('/my-posts')}>
          <span className="my-posts-link-left">
            <span className="my-posts-icon">▦</span>
            <span>My Posts</span>
          </span>
          <span className="my-posts-link-right">
            {postCount} <span className="chevron">›</span>
          </span>
        </button>

        <button type="button" onClick={openModal}>Edit Profile</button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <form onSubmit={handleEditProfile}>
              <div className="photo-upload-wrap">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Preview" className="photo-preview" />
                ) : (
                  <div className="photo-preview photo-preview-placeholder">
                    {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <label className="photo-upload-btn">
                  Change Photo
                  <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                </label>
              </div>

              <input type="text" placeholder="Full Name" value={fullName}
                onChange={(e) => setFullName(e.target.value)} required />

              {profile.role === 'Faculty' && (
                <input type="text" placeholder="Department" value={department}
                  onChange={(e) => setDepartment(e.target.value)} />
              )}

              {profile.role === 'Student' && (
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              )}

              <textarea placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />

              <div className="modal-actions">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowProfile;