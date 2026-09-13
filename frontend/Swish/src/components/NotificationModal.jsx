import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const NotificationModal = ({ isOpen, onClose, onCountUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const nav = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:3000/notifications', { withCredentials: true });
      setNotifications(res.data);
      if (onCountUpdate) {
        const unreadCount = res.data.filter(
          (n) => n.status === 'pending' || n.status === 'unread'
        ).length;
        onCountUpdate(unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleAccept = async (senderId) => {
    setActionLoading((prev) => ({ ...prev, [senderId]: 'accept' }));
    try {
      await axios.post(
        `http://localhost:3000/follow/accept/${senderId}`,
        {},
        { withCredentials: true }
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.senderId === senderId && n.type === 'follow_request'
            ? { ...n, status: 'accepted' }
            : n
        )
      );
      if (onCountUpdate) {
        onCountUpdate((prev) => Math.max(prev - 1, 0));
      }
    } catch (err) {
      alert(err.response?.data || 'Failed to accept follow request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [senderId]: null }));
    }
  };

  const handleReject = async (senderId) => {
    setActionLoading((prev) => ({ ...prev, [senderId]: 'reject' }));
    try {
      await axios.post(
        `http://localhost:3000/follow/reject/${senderId}`,
        {},
        { withCredentials: true }
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.senderId === senderId && n.type === 'follow_request'
            ? { ...n, status: 'rejected' }
            : n
        )
      );
      if (onCountUpdate) {
        onCountUpdate((prev) => Math.max(prev - 1, 0));
      }
    } catch (err) {
      alert(err.response?.data || 'Failed to reject follow request');
    } finally {
      setActionLoading((prev) => ({ ...prev, [senderId]: null }));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.patch('http://localhost:3000/notifications/read-all', {}, { withCredentials: true });
      setNotifications((prev) =>
        prev.map((n) => (n.status === 'unread' ? { ...n, status: 'read' } : n))
      );
      if (onCountUpdate) onCountUpdate(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleUserClick = (senderId) => {
    if (senderId) {
      onClose();
      nav(`/profile/${senderId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notif-modal-overlay" onClick={onClose}>
      <div className="notif-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="notif-modal-header">
          <h3>Notifications</h3>
          <div className="notif-header-actions">
            {notifications.some((n) => n.status === 'unread') && (
              <button type="button" className="notif-mark-read-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
            <button type="button" className="notif-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="notif-list">
          {loading ? (
            <p className="notif-empty">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="notif-empty">No notifications yet.</p>
          ) : (
            notifications.map((notif) => {
              const isActioning = actionLoading[notif.senderId];

              return (
                <div
                  key={notif._id}
                  className={`notif-item ${notif.status === 'unread' ? 'notif-unread' : ''}`}
                >
                  <div
                    className="notif-avatar-wrap"
                    onClick={() => handleUserClick(notif.senderId)}
                  >
                    {notif.senderPhoto ? (
                      <img src={notif.senderPhoto} alt="" className="notif-avatar" />
                    ) : (
                      <div className="notif-avatar notif-avatar-placeholder">
                        {(notif.senderName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="notif-body">
                    <p className="notif-text">
                      <strong
                        className="notif-sender-name"
                        onClick={() => handleUserClick(notif.senderId)}
                      >
                        {notif.senderName}
                      </strong>{' '}
                      {notif.type === 'follow_request' && 'wants to follow you.'}
                      {notif.type === 'follow_accept' && 'accepted your follow request.'}
                      {notif.type === 'follow_back' && 'followed you back.'}
                      {notif.type === 'like' && 'liked your post.'}
                      {notif.type === 'comment' && (
                        <>
                          commented on your post.
                          {notif.commentText && (
                            <span style={{ display: 'block', fontStyle: 'italic', color: '#6B6478', fontSize: '12px', marginTop: '2px' }}>
                              "{notif.commentText}"
                            </span>
                          )}
                        </>
                      )}
                    </p>
                    <span className="notif-time">
                      {new Date(notif.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {notif.type === 'follow_request' && (
                    <div className="notif-actions">
                      {notif.status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="btn-notif-accept"
                            disabled={!!isActioning}
                            onClick={() => handleAccept(notif.senderId)}
                          >
                            {isActioning === 'accept' ? '...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            className="btn-notif-reject"
                            disabled={!!isActioning}
                            onClick={() => handleReject(notif.senderId)}
                          >
                            {isActioning === 'reject' ? '...' : 'Reject'}
                          </button>
                        </>
                      ) : notif.status === 'accepted' ? (
                        <span className="notif-status-badge accepted">Accepted</span>
                      ) : (
                        <span className="notif-status-badge rejected">Declined</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
