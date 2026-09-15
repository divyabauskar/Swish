import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './MyPosts.css';
import { getErrorMessage } from '../utils/getErrorMessage';

function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  useEffect(() => {
    let isMounted = true;

    axios
      .get('http://localhost:3000/admin/posts', { withCredentials: true })
      .then((res) => {
        if (!isMounted) return;
        setPosts(res.data);
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

  return (
    <div className="myposts-container">
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
                  {post.archived && <span className="admin-archived-badge">Archived</span>}
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
    </div>
  );
}

export default AdminPosts;