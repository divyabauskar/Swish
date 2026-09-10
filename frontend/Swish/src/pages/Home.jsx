import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import '../components/Layout.css';
import './MyPosts.css';

function Home() {
  let stories = ["Coding Club", "Aarav", "Drama Soc", "Debate"];

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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
      .catch((err) => console.error('Error loading feed:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
        setLikeCounts((prev) => ({ ...prev, [postId]: prev[postId] }));
      });
  };

  const handleCommentDraftChange = (postId, value) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: value }));
  };

  const handleCommentSubmit = (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text || !profile) return;

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
      .catch((err) => console.error('Error posting comment:', err));
  };

  const handleCommentDelete = (postId, commentId) => {
    if (!commentId) return;

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((c) => c._id !== commentId),
    }));

    axios
      .delete(`http://localhost:3000/post/${postId}/comment/${commentId}`, { withCredentials: true })
      .catch((err) => console.error('Error deleting comment:', err));
  };

  const toggleExpandComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const visiblePosts = posts.filter((p) => !p.archived);

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="feed-header">
          <p className="eyebrow">For You</p>
          <h1>Happening on campus</h1>
          <p className="subtext">Tuned to the accounts you follow, plus what campus can't stop talking about.</p>
        </div>

        <div className="stories-row">
          <div className="story story-add">
            <div className="story-ring add-ring">+</div>
            <span>Your story</span>
          </div>

          {stories.map((name) => (
            <div className="story" key={name}>
              <div className="story-ring"></div>
              <span>{name}</span>
            </div>
          ))}
        </div>

        <div className="myposts-feed feed-placeholder">
          {loading && <p className="no-posts-text">Loading feed...</p>}

          {!loading && visiblePosts.length === 0 && (
            <p className="no-posts-text">No posts yet — be the first to share something!</p>
          )}

          {!loading &&
            visiblePosts.map((post) => {
              const isLiked = !!likedPosts[post._id];
              const likeCount = likeCounts[post._id] || 0;
              const comments = commentsByPost[post._id] || [];
              const isExpanded = !!expandedComments[post._id];
              const draft = commentDrafts[post._id] || '';

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
                  </div>

                  {post.images && post.images.length > 0 && (
                    <div className="ig-image-scroll">
                      {post.images.map((img, idx) => (
                        <img key={idx} src={img} alt="" className="ig-image" />
                      ))}
                    </div>
                  )}

                  <div className="ig-actions">
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
                      <a
                        href={post.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="drive-link-btn"
                      >
                        📁 Upload Your Event Photos
                      </a>
                    )}

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

                  <div>
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
                            profile &&
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
      </div>
    </div>
  );
}

export default Home;
