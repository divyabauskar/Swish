import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import '../components/Layout.css';
import './Profile.css';
import './Search.css';

function Search() {
  const nav = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const debounceTimer = useRef(null);

  // Live search as user types
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      axios
        .get(`http://localhost:3000/users/search?q=${encodeURIComponent(trimmed)}`, {
          withCredentials: true,
        })
        .then((res) => {
          setResults(res.data || []);
        })
        .catch((err) => {
          console.error('Search error:', err);
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  // Follow action handler for search results
  const handleFollowAction = async (targetUser) => {
    const targetId = targetUser._id;
    if (actionLoading[targetId]) return;

    setActionLoading((prev) => ({ ...prev, [targetId]: true }));
    const currentStatus = targetUser.relationshipStatus;

    try {
      if (currentStatus === 'none') {
        const res = await axios.post(
          `http://localhost:3000/follow/${targetId}`,
          {},
          { withCredentials: true }
        );
        const newStatus = res.data.status || 'requested';
        setResults((prev) =>
          prev.map((u) => (u._id === targetId ? { ...u, relationshipStatus: newStatus } : u))
        );
      } else if (currentStatus === 'follow_back') {
        await axios.post(
          `http://localhost:3000/follow/back/${targetId}`,
          {},
          { withCredentials: true }
        );
        setResults((prev) =>
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
        await axios.delete(`http://localhost:3000/unfollow/${targetId}`, { withCredentials: true });
        setResults((prev) =>
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
      console.error('Follow action error:', err);
      alert(err.response?.data || 'Failed to update follow relationship');
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="search-page-header">
          <p className="eyebrow">Find People</p>
          <h1>Search Campus</h1>
          <p className="subtext">
            Search for students, friends, and faculty across departments by name or username.
          </p>

          <div className="search-input-box">
            <span className="search-input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>

            <input
              type="text"
              className="search-text-input"
              placeholder="Search by name, username, or department..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="search-results-container">
          {loading && <p className="no-posts-text">Searching campus...</p>}

          {!loading && query.trim() && results.length === 0 && (
            <div className="search-empty-state">
              <span className="search-empty-icon">🔍</span>
              <p className="search-empty-title">No matching people found</p>
              <p className="search-empty-subtext">
                No campus users matched "{query}". Try checking the spelling or searching by department.
              </p>
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="search-empty-state">
              <span className="search-empty-icon">👥</span>
              <p className="search-empty-title">Search for anyone on campus</p>
              <p className="search-empty-subtext">
                Type a name or department to find other students and faculty.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="search-results-list">
              {results.map((user) => {
                const isActioning = !!actionLoading[user._id];
                const displayName = user.fullname || user.fullName || 'Campus User';

                return (
                  <div className="search-user-card" key={user._id}>
                    <div
                      className="search-user-left"
                      onClick={() => nav(`/profile/${user._id}`)}
                    >
                      {user.profilePhoto ? (
                        <img src={user.profilePhoto} alt="" className="search-user-avatar" />
                      ) : (
                        <div className="search-user-avatar-placeholder">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="search-user-info">
                        <p className="search-user-name">{displayName}</p>
                        <p className="search-user-meta">
                          {user.department ? `${user.department} • ` : ''}
                          {user.role || 'Student'}
                          {user.followerCount !== undefined
                            ? ` • ${user.followerCount} ${
                                user.followerCount === 1 ? 'follower' : 'followers'
                              }`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <div className="search-user-right">
                      {user.relationshipStatus === 'none' && (
                        <button
                          type="button"
                          className="btn-explore-follow"
                          style={{ minWidth: '85px', padding: '7px 14px' }}
                          disabled={isActioning}
                          onClick={() => handleFollowAction(user)}
                        >
                          {isActioning ? '...' : 'Follow'}
                        </button>
                      )}

                      {user.relationshipStatus === 'requested' && (
                        <button
                          type="button"
                          className="btn-explore-requested"
                          style={{ minWidth: '85px', padding: '7px 14px' }}
                          disabled={isActioning}
                          onClick={() => handleFollowAction(user)}
                          title="Click to cancel follow request"
                        >
                          {isActioning ? '...' : 'Requested'}
                        </button>
                      )}

                      {user.relationshipStatus === 'following' && (
                        <button
                          type="button"
                          className="btn-explore-following"
                          style={{ minWidth: '85px', padding: '7px 14px' }}
                          disabled={isActioning}
                          onClick={() => handleFollowAction(user)}
                          title="Click to unfollow"
                        >
                          {isActioning ? '...' : 'Following'}
                        </button>
                      )}

                      {user.relationshipStatus === 'follow_back' && (
                        <button
                          type="button"
                          className="btn-explore-follow-back"
                          style={{ minWidth: '85px', padding: '7px 14px' }}
                          disabled={isActioning}
                          onClick={() => handleFollowAction(user)}
                        >
                          {isActioning ? '...' : 'Follow Back'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Search;
