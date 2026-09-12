import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyPosts.css';
import { getErrorMessage } from '../utils/getErrorMessage';

const MyPosts = () => {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [votedPolls, setVotedPolls] = useState({});
  const [toast, setToast] = useState({ message: '', type: '' });

  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});

  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});

  useEffect(() => {
    let isMounted = true;
    let profileData = null;

    axios
      .get('http://localhost:3000/profile', { withCredentials: true })
      .then((profileRes) => {
        if (!isMounted) return;
        profileData = profileRes.data;
        setProfile(profileRes.data);
        return axios.get('http://localhost:3000/post', { withCredentials: true });
      })
      .then((postsRes) => {
        if (!isMounted || !postsRes) return;

        const initialLiked = {};
        const initialCounts = {};
        const initialComments = {};

        postsRes.data.forEach((p) => {
          initialLiked[p._id] = (p.likes || []).some(
            (id) => id === profileData._id || id?.toString?.() === profileData._id
          );
          initialCounts[p._id] = p.likes?.length || 0;
          initialComments[p._id] = p.comments || [];
        });

        setLikedPosts(initialLiked);
        setLikeCounts(initialCounts);
        setCommentsByPost(initialComments);
        setPosts(postsRes.data);
      })
      .catch((err) => {
        console.error('Error loading posts:', err);
        if (isMounted) showToast(getErrorMessage(err), 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleDelete = (postId) => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;

    axios
      .delete(`http://localhost:3000/post/${postId}`, { withCredentials: true })
      .then(() => {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
        setOpenMenuId(null);
        showToast('Post deleted', 'success');
      })
      .catch((err) => showToast(getErrorMessage(err), 'error'));
  };

  const handleArchive = (postId) => {
    axios
      .patch(`http://localhost:3000/post/${postId}/archive`, {}, { withCredentials: true })
      .then(() => {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
        setOpenMenuId(null);
        showToast('Post archived', 'success');
      })
      .catch((err) => showToast(getErrorMessage(err), 'error'));
  };

  const handleVote = (postId, optionIndex) => {
    setVotedPolls((prev) => ({ ...prev, [postId]: optionIndex }));
  };

  const handleLikeToggle = (postId) => {
    const isLiked = !!likedPosts[postId];

    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setLikeCounts((prev) => {
      const current = prev[postId] || 0;
      return { ...prev, [postId]: isLiked ? Math.max(current - 1, 0) : current + 1 };
    });

    axios
      .patch(`http://localhost:3000/post/${postId}/like`, {}, { withCredentials: true })
      .catch((err) => {
        console.error('Error toggling like:', err);
        setLikedPosts((prev) => ({ ...prev, [postId]: isLiked }));
        setLikeCounts((prev) => {
          const current = prev[postId] || 0;
          return { ...prev, [postId]: isLiked ? current + 1 : Math.max(current - 1, 0) };
        });
        showToast(getErrorMessage(err), 'error');
      });
  };

  const handleCommentDraftChange = (postId, value) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: value }));
  };

  const handleCommentSubmit = (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;

    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));

    axios
      .post(`http://localhost:3000/post/${postId}/comment`, { text }, { withCredentials: true })
      .then((res) => {
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.data],
        }));
      })
      .catch((err) => {
        console.error('Error posting comment:', err);
        showToast(getErrorMessage(err), 'error');
      });
  };

  const handleCommentDelete = (postId, commentId) => {
    if (!commentId) return;

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((c) => c._id !== commentId),
    }));

    axios
      .delete(`http://localhost:3000/post/${postId}/comment/${commentId}`, { withCredentials: true })
      .catch((err) => {
        console.error('Error deleting comment:', err);
        showToast(getErrorMessage(err), 'error');
      });
  };

  const toggleExpandComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
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

      {toast.message && (
        <div className={`post-toast ${toast.type === 'error' ? 'post-toast-error' : 'post-toast-success'}`}>
          {toast.message}
        </div>
      )}

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

            const isLiked = !!likedPosts[post._id];
            const likeCount = likeCounts[post._id] || 0;
            const comments = commentsByPost[post._id] || [];
            const isExpanded = !!expandedComments[post._id];
            const draft = commentDrafts[post._id] || '';

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

                <div className="ig-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`ig-action-btn ig-like-btn ${isLiked ? 'liked' : ''}`}
                    onClick={() => handleLikeToggle(post._id)}
                  >
                    <span>{isLiked ? '❤️' : '🤍'}</span>
                    {likeCount > 0 && <span className="ig-action-count">{likeCount}</span>}
                  </button>

                  <button
                    type="button"
                    className="ig-action-btn ig-comment-btn"
                    onClick={() => toggleExpandComments(post._id)}
                  >
                    <span>💬</span>
                    {comments.length > 0 && (
                      <span className="ig-action-count">{comments.length}</span>
                    )}
                  </button>
                </div>

                {likeCount > 0 && (
                  <p className="ig-likes-count">
                    {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                  </p>
                )}

                <div className="ig-post-body">
                  {post.song && <p className="ig-song">🎵 {post.song}</p>}

                 {post.driveLink && (
                     <button
                            type="button"
                            className="drive-link-btn"
                            onClick={(e) => {
                            e.stopPropagation();
                            window.open(post.driveLink, '_blank', 'noopener,noreferrer');
                }}
                         >
                        📁 Upload Your Event Photos
                     </button>
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

                <div onClick={(e) => e.stopPropagation()}>
                  {comments.length > 0 && !isExpanded && (
                    <button
                      type="button"
                      className="ig-view-comments"
                      onClick={() => toggleExpandComments(post._id)}
                    >
                      View {comments.length === 1 ? 'the' : `all ${comments.length}`} comment
                      {comments.length === 1 ? '' : 's'}
                    </button>
                  )}

                  {isExpanded && comments.length > 0 && (
                    <div className="ig-comment-list">
                      {comments.map((c, idx) => {
                        const commentIdStr = c._id?.toString?.() || c._id;
                        const authorIdStr = c.authorId?.toString?.() || c.authorId;
                        const canDelete =
                          commentIdStr &&
                          (authorIdStr === profile._id || post.authorId === profile._id);

                        return (
                          <p className="ig-comment-item" key={commentIdStr || idx}>
                            <strong>{c.authorName}</strong>
                            {c.text}
                            {canDelete && (
                              <button
                                type="button"
                                className="ig-comment-delete"
                                onClick={() => handleCommentDelete(post._id, commentIdStr)}
                              >
                                ✕
                              </button>
                            )}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  <div className="ig-comment-input-row">
                    <input
                      type="text"
                      className="ig-comment-input"
                      placeholder="Add a comment..."
                      value={draft}
                      onChange={(e) => handleCommentDraftChange(post._id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommentSubmit(post._id);
                      }}
                    />
                    <button
                      type="button"
                      className={`ig-comment-post-btn ${draft.trim() ? 'active' : ''}`}
                      onClick={() => handleCommentSubmit(post._id)}
                    >
                      Post
                    </button>
                  </div>
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