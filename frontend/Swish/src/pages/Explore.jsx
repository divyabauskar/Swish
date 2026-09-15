import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import '../components/Layout.css';
import './MyPosts.css';
import './Explore.css';

function Explore() {
  const nav = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileActionLoading, setProfileActionLoading] = useState({});

  // Likes & comments state for posts
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});

  // Fetch current user profile
  useEffect(() => {
    axios
      .get('http://localhost:3000/profile', { withCredentials: true })
      .then((res) => setProfile(res.data))
      .catch((err) => console.error('Error loading current user profile:', err));
  }, []);

  // Fetch trending people and trending posts
  useEffect(() => {
    let isMounted = true;
    setLoadingPosts(true);
    setLoadingProfiles(true);

    axios
      .get('http://localhost:3000/explore/trending', { withCredentials: true })
      .then((res) => {
        if (!isMounted) return;
        const data = res.data || {};
        const people = data.trendingPeople || [];
        const postsData = data.trendingPosts || [];

        setProfiles(people);
        setPosts(postsData);

        const initialLiked = {};
        const initialCounts = {};
        const initialComments = {};

        postsData.forEach((p) => {
          initialLiked[p._id] = (p.likes || []).some(
            (id) => id === profile?._id || id?.toString?.() === profile?._id
          );
          initialCounts[p._id] = p.likes?.length || 0;
          initialComments[p._id] = p.comments || [];
        });

        setLikedPosts(initialLiked);
        setLikeCounts(initialCounts);
        setCommentsByPost(initialComments);
      })
      .catch((err) => {
        console.error('Error loading explore trending data:', err);
        if (isMounted) {
          setProfiles([]);
          setPosts([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingPosts(false);
          setLoadingProfiles(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [profile?._id]);

  // Handle like toggle
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

  // Comments handlers
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

  // Follow actions in discovery section
  const handleProfileFollowAction = async (targetUser) => {
    const targetId = targetUser._id;
    if (profileActionLoading[targetId]) return;

    setProfileActionLoading((prev) => ({ ...prev, [targetId]: true }));
    const currentStatus = targetUser.relationshipStatus;

    try {
      if (currentStatus === 'none') {
        // Send follow request
        const res = await axios.post(
          `http://localhost:3000/follow/${targetId}`,
          {},
          { withCredentials: true }
        );
        const newStatus = res.data.status || 'requested';
        setProfiles((prev) =>
          prev.map((u) => (u._id === targetId ? { ...u, relationshipStatus: newStatus } : u))
        );
      } else if (currentStatus === 'follow_back') {
        // Follow back
        await axios.post(
          `http://localhost:3000/follow/back/${targetId}`,
          {},
          { withCredentials: true }
        );
        setProfiles((prev) =>
          prev.map((u) =>
            u._id === targetId
              ? {
                  ...u,
                  relationshipStatus: 'following',
                  followerCount: (u.followerCount || 0) + 1,
                }
              : u
          )
        );
      } else if (currentStatus === 'requested' || currentStatus === 'following') {
        // Unfollow or cancel request
        await axios.delete(`http://localhost:3000/unfollow/${targetId}`, { withCredentials: true });
        setProfiles((prev) =>
          prev.map((u) =>
            u._id === targetId
              ? {
                  ...u,
                  relationshipStatus: 'none',
                  followerCount:
                    currentStatus === 'following'
                      ? Math.max((u.followerCount || 0) - 1, 0)
                      : u.followerCount,
                }
              : u
          )
        );
      }
    } catch (err) {
      console.error('Error in profile follow action:', err);
      alert(err.response?.data || 'Failed to update follow relationship');
    } finally {
      setProfileActionLoading((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="feed-header explore-header">
          <p className="eyebrow">Discover</p>
          <h1>Explore Campus</h1>
          <p className="subtext">
            Discover what's trending across your campus.
          </p>
        </div>

        {/* Profiles Discovery Section: Trending People */}
        {profiles.length > 0 && (
          <div className="explore-profiles-section">
            <div className="explore-section-title-wrap">
              <h2 className="explore-section-title">🔥 Trending People</h2>
            </div>

            <div className="explore-profiles-scroll">
              {profiles.map((u) => {
                const isActioning = !!profileActionLoading[u._id];
                const displayName = u.fullname || u.fullName || 'Campus User';

                return (
                  <div className="explore-profile-card" key={u._id}>
                    <div
                      className="explore-profile-avatar-wrap"
                      onClick={() => nav(`/profile/${u._id}`)}
                    >
                      {u.profilePhoto ? (
                        <img src={u.profilePhoto} alt="" className="explore-profile-avatar" />
                      ) : (
                        <div className="explore-profile-avatar-placeholder">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <p
                      className="explore-profile-name"
                      title={displayName}
                      onClick={() => nav(`/profile/${u._id}`)}
                    >
                      {displayName}
                    </p>

                    <p className="explore-profile-dept" title={u.department || u.role || 'Student'}>
                      {u.department || u.role || 'Student'}
                    </p>

                    <p className="explore-profile-stats">
                      {u.followerCount || 0} {u.followerCount === 1 ? 'follower' : 'followers'}
                    </p>

                    {u.relationshipStatus === 'none' && (
                      <button
                        type="button"
                        className="btn-explore-follow"
                        disabled={isActioning}
                        onClick={() => handleProfileFollowAction(u)}
                      >
                        {isActioning ? '...' : 'Follow'}
                      </button>
                    )}

                    {u.relationshipStatus === 'requested' && (
                      <button
                        type="button"
                        className="btn-explore-requested"
                        disabled={isActioning}
                        onClick={() => handleProfileFollowAction(u)}
                        title="Click to cancel follow request"
                      >
                        {isActioning ? '...' : 'Requested'}
                      </button>
                    )}

                    {u.relationshipStatus === 'following' && (
                      <button
                        type="button"
                        className="btn-explore-following"
                        disabled={isActioning}
                        onClick={() => handleProfileFollowAction(u)}
                        title="Click to unfollow"
                      >
                        {isActioning ? '...' : 'Following'}
                      </button>
                    )}

                    {u.relationshipStatus === 'follow_back' && (
                      <button
                        type="button"
                        className="btn-explore-follow-back"
                        disabled={isActioning}
                        onClick={() => handleProfileFollowAction(u)}
                      >
                        {isActioning ? '...' : 'Follow Back'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section Heading: Trending Posts */}
        <div style={{ margin: '14px 0 10px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="explore-section-title">🔥 Trending Posts</h2>
          <span style={{ fontSize: '12px', color: '#8C8494', fontWeight: 600 }}>
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        {/* Posts Feed */}
        <div className="myposts-feed feed-placeholder">
          {loadingPosts && <p className="no-posts-text">Loading trending posts...</p>}

          {!loadingPosts && posts.length === 0 && (
            <p className="no-posts-text">No trending posts right now. Check back soon!</p>
          )}

          {!loadingPosts &&
            posts.map((post) => {
              const isLiked = !!likedPosts[post._id];
              const likeCount = likeCounts[post._id] || 0;
              const comments = commentsByPost[post._id] || [];
              const isExpanded = !!expandedComments[post._id];
              const draft = commentDrafts[post._id] || '';

              return (
                <div className="ig-post" key={post._id}>
                  <div className="ig-post-header">
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                      onClick={() => post.authorId && nav(`/profile/${post.authorId}`)}
                    >
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

                    {post.isTrending && (
                      <span className="post-trend-badge">🔥 Trending</span>
                    )}
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
                      <strong
                        style={{ cursor: 'pointer' }}
                        onClick={() => post.authorId && nav(`/profile/${post.authorId}`)}
                      >
                        {post.authorName}
                      </strong>{' '}
                      {post.caption}
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
                              <strong
                                style={{ cursor: 'pointer' }}
                                onClick={() => c.authorId && nav(`/profile/${c.authorId}`)}
                              >
                                {c.authorName}
                              </strong>{' '}
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

export default Explore;
