import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyPosts.css';

const MyPosts = () => {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [votedPolls, setVotedPolls] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    let isMounted = true;

    axios
      .get('http://localhost:3000/profile', { withCredentials: true })
      .then((profileRes) => {
        if (!isMounted) return;
        setProfile(profileRes.data);
        return axios.get('http://localhost:3000/post', { withCredentials: true });
      })
      .then((postsRes) => {
        if (!isMounted || !postsRes) return;
        setPosts(postsRes.data);
      })
      .catch((err) => console.error('Error loading posts:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const handleDelete = (postId) => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;

    axios
      .delete(`http://localhost:3000/post/${postId}`, { withCredentials: true })
      .then(() => {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
        setOpenMenuId(null);
        showToast('Post deleted');
      })
      .catch((err) => alert(err.response?.data || err.message));
  };

  const handleArchive = (postId) => {
    axios
      .patch(`http://localhost:3000/post/${postId}/archive`, {}, { withCredentials: true })
      .then(() => {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
        setOpenMenuId(null);
        showToast('Post archived');
      })
      .catch((err) => alert(err.response?.data || err.message));
  };

  const handleVote = (postId, optionIndex) => {
    setVotedPolls((prev) => ({ ...prev, [postId]: optionIndex }));
  };

  if (loading) {
    return (
      <div className="myposts-container">
        <p>Loading posts...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="myposts-container">
        <p>Failed to load profile. Please log in again.</p>
      </div>
    );
  }

  const myPosts = posts.filter((p) => p.authorId === profile._id && !p.archived);
  const displayName = profile.fullname || profile.fullName || 'User';

  return (
    <div className="myposts-container">
      <div className="myposts-header">
        <button className="back-btn" onClick={() => nav('/profile')}>
          ‹ Back
        </button>
        <h2>My Posts</h2>
      </div>

      {toast && <div className="post-toast">{toast}</div>}

      {myPosts.length === 0 ? (
        <p className="no-posts-text">You haven't posted anything yet.</p>
      ) : (
        <div className="myposts-feed">
          {myPosts.map((post) => {
            const hasVoted = votedPolls[post._id] !== undefined;
            const selectedIndex = votedPolls[post._id];
            const pollOptions = post.poll?.options || [];
            const totalOptions = pollOptions.length || 1;
            const basePercent = Math.floor(100 / totalOptions);

            return (
              <div className="ig-post" key={post._id} onClick={() => setOpenMenuId(null)}>
                <div className="ig-post-header">
                  {profile.profilePhoto ? (
                    <img src={profile.profilePhoto} alt="" className="ig-avatar" />
                  ) : (
                    <div className="ig-avatar ig-avatar-placeholder">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ig-header-text">
                    <p className="ig-username">{post.authorName}</p>
                    {post.location && <p className="ig-location">📍 {post.location}</p>}
                  </div>

                  <div className="ig-menu-wrap">
                    <button
                      type="button"
                      className="ig-menu-dots"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === post._id ? null : post._id);
                      }}
                    >
                      ⋯
                    </button>

                    {openMenuId === post._id && (
                      <div className="ig-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleArchive(post._id)}>
                          Archive Post
                        </button>
                        <button
                          type="button"
                          className="ig-menu-delete"
                          onClick={() => handleDelete(post._id)}
                        >
                          Delete Post
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {post.images && post.images.length > 0 && (
                  <div className="ig-image-scroll">
                    {post.images.map((img, idx) => (
                      <img key={idx} src={img} alt="" className="ig-image" />
                    ))}
                  </div>
                )}

                <div className="ig-post-body">
                  {post.song && <p className="ig-song">🎵 {post.song}</p>}

                  {post.driveLink && (
                    <a
                      href={post.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="drive-link-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📁 Upload Your Event Photos
                    </a>
                  )}

                  <p className="ig-caption">
                    <strong>{post.authorName}</strong> {post.caption}
                  </p>

                  {post.poll && pollOptions.length > 0 && (
                    <div className="wa-poll">
                      <p className="wa-poll-question">{post.poll.question}</p>
                      <div className="wa-poll-options">
                        {pollOptions.map((opt, idx) => {
                          const isSelected = selectedIndex === idx;
                          const percent = isSelected
                            ? basePercent + (100 - basePercent * totalOptions)
                            : basePercent;

                          return (
                            <div
                              key={idx}
                              className={`wa-poll-option ${hasVoted ? 'wa-poll-voted' : ''} ${
                                isSelected ? 'wa-poll-selected' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!hasVoted) handleVote(post._id, idx);
                              }}
                            >
                              {hasVoted && (
                                <div className="wa-poll-fill" style={{ width: `${percent}%` }}></div>
                              )}
                              <div className="wa-poll-option-content">
                                <span className="wa-poll-radio">
                                  {isSelected && <span className="wa-poll-radio-dot"></span>}
                                </span>
                                <span className="wa-poll-option-text">{opt.text}</span>
                                {hasVoted && <span className="wa-poll-percent">{percent}%</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="wa-poll-footer">
                        {hasVoted ? 'Tap to change your vote' : 'Select an option'}
                      </p>
                    </div>
                  )}

                  <p className="ig-timestamp">
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPosts;