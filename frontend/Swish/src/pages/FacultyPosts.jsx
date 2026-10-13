import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './MyPosts.css';
import { getErrorMessage } from '../utils/getErrorMessage';

function FacultyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [flagTarget, setFlagTarget] = useState(null); // { type: 'post'|'comment', postId, commentId, label }
  const [flagReason, setFlagReason] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const loadPosts = () => {
    axios.get('http://localhost:3000/faculty/posts', { withCredentials: true })
      .then((res) => setPosts(res.data))
      .catch((err) => showToast(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPosts(); }, []);

  const openFlagModal = (type, postId, commentId, label) => {
    setFlagTarget({ type, postId, commentId, label });
    setFlagReason('');
    setOpenMenuId(null);
  };

  const closeFlagModal = () => {
    setFlagTarget(null);
    setFlagReason('');
  };

  const handleSubmitFlag = (e) => {
    e.preventDefault();
    if (!flagReason.trim()) {
      showToast('Please write a reason for flagging', 'error');
      return;
    }

    setSubmittingFlag(true);
    const url = flagTarget.type === 'post'
      ? `http://localhost:3000/post/${flagTarget.postId}/flag`
      : `http://localhost:3000/post/${flagTarget.postId}/comment/${flagTarget.commentId}/flag`;

    axios.patch(url, { reason: flagReason.trim() }, { withCredentials: true })
      .then(() => {
        showToast(`${flagTarget.type === 'post' ? 'Post' : 'Comment'} flagged`, 'success');
        closeFlagModal();
        loadPosts();
      })
      .catch((err) => showToast(getErrorMessage(err), 'error'))
      .finally(() => setSubmittingFlag(false));
  };

  return (
    <div className="myposts-container" onClick={() => setOpenMenuId(null)}>
      <div className="myposts-header">
        <Link to="/home" className="back-btn">‹ Back</Link>
        <h2>Student Posts</h2>
      </div>

      {toast.message && (
        <div className={`post-toast ${toast.type === 'error' ? 'post-toast-error' : 'post-toast-success'}`}>
          {toast.message}
        </div>
      )}

      {loading && <p className="no-posts-text">Loading posts...</p>}
      {!loading && posts.length === 0 && <p className="no-posts-text">No student posts found.</p>}

      {!loading && posts.length > 0 && (
        <div className="myposts-feed">
          {posts.map((post) => {
            const comments = post.comments || [];
            return (
              <div className="ig-post" key={post._id}>
                <div className="ig-post-header">
                  {post.authorPhoto ? (
                    <img src={post.authorPhoto} alt="" className="ig-avatar" />
                  ) : (
                    <div className="ig-avatar ig-avatar-placeholder">
                      {(post.authorName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ig-header-text">
                    <p className="ig-username">{post.authorName}</p>
                    {post.location && <p className="ig-location">📍 {post.location}</p>}
                  </div>

                  {post.flagged && <span className="flag-badge">🚩 Flagged</span>}

                  <div className="ig-menu-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ig-menu-dots"
                      onClick={() => setOpenMenuId(openMenuId === post._id ? null : post._id)}
                    >
                      ⋯
                    </button>
                    {openMenuId === post._id && (
                      <div className="ig-menu-dropdown">
                        <button
                          type="button"
                          onClick={() => openFlagModal('post', post._id, null, post.authorName)}
                        >
                          🚩 Flag Post
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
                  <p className="ig-caption">
                    <strong>{post.authorName}</strong> {post.caption}
                  </p>
                  <p className="ig-timestamp">
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="ig-comment-list">
                  {comments.length === 0 && (
                    <p className="no-posts-text" style={{ margin: '4px 16px' }}>
                      No comments on this post.
                    </p>
                  )}
                  {comments.map((c, idx) => {
                    const commentIdStr = c._id?.toString?.() || c._id;
                    return (
                      <p className="ig-comment-item" key={commentIdStr || idx}>
                        <strong>{c.authorName}</strong>
                        {c.text}
                        {c.flagged && <span className="flag-badge-inline">🚩</span>}
                        {commentIdStr && !c.flagged && (
                          <button
                            type="button"
                            className="ig-comment-flag"
                            onClick={() => openFlagModal('comment', post._id, commentIdStr, c.authorName)}
                          >
                            Flag
                          </button>
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {flagTarget && (
        <div className="modal-overlay" onClick={closeFlagModal}>
          <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Flag {flagTarget.type === 'post' ? 'Post' : 'Comment'}</h3>
            <p className="warning-modal-subtitle">
              By <strong>{flagTarget.label}</strong> — explain why this {flagTarget.type} violates college rules.
            </p>
            <form onSubmit={handleSubmitFlag}>
              <textarea
                placeholder="Write the reason for flagging..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="submit" disabled={submittingFlag}>
                  {submittingFlag ? 'Flagging...' : 'Flag'}
                </button>
                <button type="button" onClick={closeFlagModal} disabled={submittingFlag}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyPosts;