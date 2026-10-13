import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './MyPosts.css';
import { getErrorMessage } from '../utils/getErrorMessage';

function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [warningTarget, setWarningTarget] = useState(null); // { id, name }
  const [warningReason, setWarningReason] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const loadPosts = () => {
    axios
      .get('http://localhost:3000/admin/posts', { withCredentials: true })
      .then((res) => setPosts(res.data))
      .catch((err) => {
        console.error('Error loading posts:', err);
        showToast(getErrorMessage(err), 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCommentDelete = (postId, commentId) => {
    if (!commentId) return;
    if (!window.confirm('Delete this comment?')) return;

    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? { ...p, comments: (p.comments || []).filter((c) => c._id !== commentId) }
          : p
      )
    );

    axios
      .delete(`http://localhost:3000/post/${postId}/comment/${commentId}`, { withCredentials: true })
      .then(() => showToast('Comment deleted', 'success'))
      .catch((err) => {
        console.error('Error deleting comment:', err);
        showToast(getErrorMessage(err), 'error');
      });
  };

  const openWarningModal = (authorId, authorName) => {
    setWarningTarget({ id: authorId, name: authorName });
    setWarningReason('');
    setOpenMenuId(null);
  };

  const closeWarningModal = () => {
    setWarningTarget(null);
    setWarningReason('');
  };

  const handleSendWarning = (e) => {
    e.preventDefault();
    if (!warningReason.trim()) {
      showToast('Please write a reason for the warning', 'error');
      return;
    }

    setSendingWarning(true);
    axios
      .post(
        `http://localhost:3000/admin/warn/${warningTarget.id}`,
        { reason: warningReason.trim() },
        { withCredentials: true }
      )
      .then(() => {
        showToast(`Warning sent to ${warningTarget.name}`, 'success');
        closeWarningModal();
      })
      .catch((err) => showToast(getErrorMessage(err), 'error'))
      .finally(() => setSendingWarning(false));
  };

  return (
    <div className="myposts-container" onClick={() => setOpenMenuId(null)}>
      <div className="myposts-header">
        <Link to="/admin-dashboard" className="back-btn">‹ Back</Link>
        <h2>Manage Posts</h2>
      </div>

      {toast.message && (
        <div className={`post-toast ${toast.type === 'error' ? 'post-toast-error' : 'post-toast-success'}`}>
          {toast.message}
        </div>
      )}

      {loading && <p className="no-posts-text">Loading posts...</p>}

      {!loading && posts.length === 0 && (
        <p className="no-posts-text">No posts found.</p>
      )}

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

                  {post.flagged && (
                    <span className="flag-badge" title={post.flagReason}>
                      🚩 Flagged
                    </span>
                  )}
                  {post.archived && <span className="admin-archived-badge">Archived</span>}

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
                          onClick={() => openWarningModal(post.authorId, post.authorName)}
                        >
                          ⚠️ Send Warning
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {post.flagged && post.flagReason && (
                  <p className="flag-reason-text">
                    🚩 Flagged by {post.flaggedByName || 'Faculty'}: "{post.flagReason}"
                  </p>
                )}

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
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
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
                        {commentIdStr && (
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
              </div>
            );
          })}
        </div>
      )}

      {warningTarget && (
        <div className="modal-overlay" onClick={closeWarningModal}>
          <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send Warning</h3>
            <p className="warning-modal-subtitle">
              To <strong>{warningTarget.name}</strong> — explain why this account may be suspended if the behavior continues.
            </p>
            <form onSubmit={handleSendWarning}>
              <textarea
                placeholder="Write the reason for this warning..."
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="submit" disabled={sendingWarning}>
                  {sendingWarning ? 'Sending...' : 'Send Warning'}
                </button>
                <button type="button" onClick={closeWarningModal} disabled={sendingWarning}>
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

export default AdminPosts;