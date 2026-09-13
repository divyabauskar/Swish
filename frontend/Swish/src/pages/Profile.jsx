import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Profile.css';
import { getErrorMessage } from '../utils/getErrorMessage';

const ShowProfile = () => {
  const { userId } = useParams();
  const nav = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Edit profile state (for self)
  const [showEditModal, setShowEditModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Stats & Relationship state
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [relationshipStatus, setRelationshipStatus] = useState('none'); // 'none' | 'requested' | 'following' | 'self'
  const [userPosts, setUserPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // Modal lists
  const [modalListType, setModalListType] = useState(null); // 'followers' | 'following' | null
  const [userList, setUserList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3500);
  };

  // Fetch current user and target profile
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current logged-in user
      const selfRes = await axios.get('http://localhost:3000/profile', { withCredentials: true });
      const selfData = selfRes.data;
      setCurrentUser(selfData);

      const selfId = selfData._id ? selfData._id.toString() : '';
      const isSelf = !userId || userId === selfId;
      const targetId = isSelf ? selfId : userId;

      // 2. Fetch target profile
      let targetProfile = null;
      if (isSelf) {
        targetProfile = selfData;
      } else {
        const targetRes = await axios.get(`http://localhost:3000/profile/${targetId}`, {
          withCredentials: true,
        });
        targetProfile = targetRes.data;
      }

      setProfile(targetProfile);
      setFollowerCount(Number(targetProfile.followerCount ?? targetProfile.followers ?? 0));
      setFollowingCount(Number(targetProfile.followingCount ?? targetProfile.following ?? 0));
      setRelationshipStatus(targetProfile.relationshipStatus || (isSelf ? 'self' : 'none'));

      // 3. Fetch user's posts
      try {
        const postsRes = await axios.get(`http://localhost:3000/users/${targetId}/posts`, {
          withCredentials: true,
        });
        setUserPosts(postsRes.data || []);
      } catch {
        setUserPosts([]);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      showToast(getErrorMessage(err), 'error');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userId]);

  const isOwnProfile =
    !userId ||
    (currentUser && profile && (profile._id?.toString() === currentUser._id?.toString()));

  // Follow Action
  const handleFollow = async () => {
    if (!profile || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        `http://localhost:3000/follow/${profile._id}`,
        {},
        { withCredentials: true }
      );
      setRelationshipStatus(res.data.status || 'requested');
      showToast('Follow request sent!');
    } catch (err) {
      alert(err.response?.data || 'Failed to send follow request');
    } finally {
      setActionLoading(false);
    }
  };

  // Follow Back Action
  const handleFollowBack = async () => {
    if (!profile || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        `http://localhost:3000/follow/back/${profile._id}`,
        {},
        { withCredentials: true }
      );
      setRelationshipStatus('following');
      setFollowerCount((prev) => prev + 1);
      showToast('Followed back successfully!');
    } catch (err) {
      alert(err.response?.data || 'Failed to follow back');
    } finally {
      setActionLoading(false);
    }
  };

  // Unfollow or Cancel Request Action
  const handleUnfollow = async () => {
    if (!profile || actionLoading) return;
    const isRequested = relationshipStatus === 'requested';
    const confirmMsg = isRequested
      ? 'Cancel your follow request?'
      : `Unfollow ${profile.fullname || 'this user'}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      await axios.delete(`http://localhost:3000/unfollow/${profile._id}`, {
        withCredentials: true,
      });
      setRelationshipStatus('none');
      if (!isRequested) {
        setFollowerCount((prev) => Math.max(prev - 1, 0));
        showToast('Unfollowed successfully');
      } else {
        showToast('Follow request cancelled');
      }
    } catch (err) {
      alert(err.response?.data || 'Failed to unfollow');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Followers or Following List Modal
  const openUserListModal = async (type) => {
    if (!profile) return;
    setModalListType(type);
    setLoadingList(true);
    try {
      const endpoint =
        type === 'followers'
          ? `http://localhost:3000/users/${profile._id}/followers`
          : `http://localhost:3000/users/${profile._id}/following`;
      const res = await axios.get(endpoint, { withCredentials: true });
      setUserList(res.data || []);
    } catch (err) {
      console.error(`Error loading ${type}:`, err);
      setUserList([]);
    } finally {
      setLoadingList(false);
    }
  };

  const closeUserListModal = () => {
    setModalListType(null);
    setUserList([]);
  };

  // Edit Profile Handlers (for own profile)
  const openEditModal = () => {
    if (!profile) return;
    setFullName(profile.fullname || profile.fullName || '');
    setDepartment(profile.department || '');
    setYear(profile.year ? String(profile.year) : '');
    setBio(profile.bio || '');
    setProfilePhoto(profile.profilePhoto || '');
    setShowEditModal(true);
  };

  const closeEditModal = () => setShowEditModal(false);

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
      await fetchAllData();
      closeEditModal();
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <p className="profile-loading-text">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <p className="profile-loading-text">User profile not found. Please check the URL or log in.</p>
      </div>
    );
  }

  const displayName = profile.fullname || profile.fullName || 'Campus User';

  return (
    <div className="profile-container">
      {toast.message && (
        <div className={`profile-toast ${toast.type === 'error' ? 'profile-toast-error' : 'profile-toast-success'}`}>
          {toast.message}
        </div>
      )}

      <div className="profile-card">
        {/* Back navigation when viewing someone else */}
        {!isOwnProfile && (
          <button type="button" className="profile-back-btn" onClick={() => nav(-1)}>
            ‹ Back
          </button>
        )}

        {/* Profile Avatar */}
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

        {/* Profile Bio & Details */}
        <div className="profile-details">
          <p>
            <strong>Role</strong>
            <span>{profile.role || '—'}</span>
          </p>

          {profile.role === 'Student' && (
            <>
              <p>
                <strong>Department</strong>
                <span>{profile.department || '—'}</span>
              </p>
              <p>
                <strong>Year</strong>
                <span>{profile.year ? `${profile.year} Year` : '—'}</span>
              </p>
            </>
          )}

          {profile.role === 'Faculty' && (
            <p>
              <strong>Department</strong>
              <span>{profile.department || '—'}</span>
            </p>
          )}

          <p>
            <strong>Bio</strong>
            <span>{profile.bio || 'No bio added yet.'}</span>
          </p>
        </div>

        {/* Interactive Stats Bar */}
        <div className="profile-stats-bar">
          <div className="stat-item">
            <span className="stat-number">{userPosts.length}</span>
            <span className="stat-label">Posts</span>
          </div>

          <button
            type="button"
            className="stat-item stat-clickable"
            onClick={() => openUserListModal('followers')}
          >
            <span className="stat-number">{followerCount}</span>
            <span className="stat-label">Followers</span>
          </button>

          <button
            type="button"
            className="stat-item stat-clickable"
            onClick={() => openUserListModal('following')}
          >
            <span className="stat-number">{followingCount}</span>
            <span className="stat-label">Following</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions-row">
          {isOwnProfile ? (
            <>
              <button type="button" className="btn-profile-primary" onClick={openEditModal}>
                Edit Profile
              </button>
              <button
                type="button"
                className="my-posts-link"
                style={{ marginTop: 0 }}
                onClick={() => nav('/my-posts')}
              >
                <span className="my-posts-link-left">
                  <span className="my-posts-icon">▦</span>
                  <span>Manage Posts</span>
                </span>
                <span className="my-posts-link-right">
                  {userPosts.length} <span className="chevron">›</span>
                </span>
              </button>
            </>
          ) : (
            <div className="other-user-actions">
              {relationshipStatus === 'none' && (
                <button
                  type="button"
                  className="btn-profile-follow"
                  disabled={actionLoading}
                  onClick={handleFollow}
                >
                  {actionLoading ? '...' : 'Follow'}
                </button>
              )}

              {relationshipStatus === 'requested' && (
                <button
                  type="button"
                  className="btn-profile-requested"
                  disabled={actionLoading}
                  onClick={handleUnfollow}
                  title="Click to cancel follow request"
                >
                  {actionLoading ? '...' : 'Requested'}
                </button>
              )}

              {relationshipStatus === 'following' && (
                <button
                  type="button"
                  className="btn-profile-following"
                  disabled={actionLoading}
                  onClick={handleUnfollow}
                  title="Click to unfollow"
                >
                  {actionLoading ? '...' : 'Following'}
                </button>
              )}

              {relationshipStatus === 'follow_back' && (
                <button
                  type="button"
                  className="btn-profile-follow-back"
                  disabled={actionLoading}
                  onClick={handleFollowBack}
                >
                  {actionLoading ? '...' : 'Follow Back'}
                </button>
              )}

            </div>
          )}
        </div>

        {/* Instagram-style Posts Section */}
        <div className="profile-posts-section">
          <div className="posts-section-divider">
            <span className="posts-grid-icon">▦</span>
            <span>POSTS</span>
          </div>

          {userPosts.length === 0 ? (
            <p className="no-posts-text">No posts yet.</p>
          ) : (
            <div className="profile-posts-grid">
              {userPosts.map((post) => {
                const hasImage = post.images && post.images.length > 0;
                const likesNum = post.likes?.length || 0;
                const commentsNum = post.comments?.length || 0;

                return (
                  <div
                    key={post._id}
                    className="profile-post-card"
                    onClick={() => setSelectedPost(post)}
                  >
                    {hasImage ? (
                      <img src={post.images[0]} alt="Post thumbnail" className="post-grid-img" />
                    ) : (
                      <div className="post-grid-text-thumb">
                        <p>{post.caption ? post.caption.slice(0, 60) : 'Text Post'}</p>
                      </div>
                    )}
                    <div className="post-grid-overlay">
                      <span>❤️ {likesNum}</span>
                      <span>💬 {commentsNum}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Followers / Following List Modal */}
      {modalListType && (
        <div className="modal-overlay" onClick={closeUserListModal}>
          <div className="modal-content user-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="user-list-modal-header">
              <h3>{modalListType === 'followers' ? 'Followers' : 'Following'}</h3>
              <button type="button" className="notif-close-btn" onClick={closeUserListModal}>
                ✕
              </button>
            </div>

            <div className="user-list-body">
              {loadingList ? (
                <p className="notif-empty">Loading...</p>
              ) : userList.length === 0 ? (
                <p className="notif-empty">
                  {modalListType === 'followers'
                    ? 'No followers yet.'
                    : 'Not following anyone yet.'}
                </p>
              ) : (
                userList.map((u) => {
                  const uName = u.fullname || u.fullName || 'Campus User';
                  return (
                    <div
                      key={u._id}
                      className="user-list-item"
                      onClick={() => {
                        closeUserListModal();
                        nav(`/profile/${u._id}`);
                      }}
                    >
                      <div className="notif-avatar-wrap">
                        {u.profilePhoto ? (
                          <img src={u.profilePhoto} alt="" className="notif-avatar" />
                        ) : (
                          <div className="notif-avatar notif-avatar-placeholder">
                            {uName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="user-list-info">
                        <p className="user-list-name">{uName}</p>
                        <p className="user-list-role">
                          {u.role}
                          {u.department ? ` • ${u.department}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="post-detail-header">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt="" className="post-detail-avatar" />
              ) : (
                <div className="post-detail-avatar post-detail-avatar-placeholder">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="post-detail-username">{displayName}</p>
                {selectedPost.location && (
                  <p className="post-detail-location">📍 {selectedPost.location}</p>
                )}
              </div>
            </div>

            {selectedPost.images && selectedPost.images.length > 0 && (
              <div className="post-detail-images">
                {selectedPost.images.map((img, idx) => (
                  <img key={idx} src={img} alt="" />
                ))}
              </div>
            )}

            {selectedPost.song && <p className="post-detail-song">🎵 {selectedPost.song}</p>}

            <p className="post-detail-caption">
              <strong>{displayName}</strong> {selectedPost.caption}
            </p>

            <div style={{ padding: '0 16px 12px', fontSize: '13px', color: '#6B6478' }}>
              ❤️ {selectedPost.likes?.length || 0} likes &nbsp;•&nbsp; 💬{' '}
              {selectedPost.comments?.length || 0} comments
            </div>

            <button
              type="button"
              className="close-detail-btn"
              onClick={() => setSelectedPost(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal (for self) */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
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

              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              {profile.role === 'Faculty' && (
                <input
                  type="text"
                  placeholder="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
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

              <textarea
                placeholder="Bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />

              <div className="modal-actions">
                <button type="submit">Save Changes</button>
                <button type="button" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowProfile;