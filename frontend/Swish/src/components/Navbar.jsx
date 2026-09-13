import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NotificationModal from './NotificationModal';
import './Layout.css';

function Navbar() {
  const nav = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatToast, setChatToast] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('http://localhost:3000/notifications', { withCredentials: true });
      const pendingCount = res.data.filter(
        (n) => n.status === 'pending' || n.status === 'unread'
      ).length;
      setUnreadCount(pendingCount);
    } catch {
      // Ignored if not logged in
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleChatClick = () => {
    setChatToast(true);
    setTimeout(() => setChatToast(false), 3000);
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-logo" onClick={() => nav('/')}>
          <span className="logo-mark">S</span>
          <span className="logo-word">swish<span className="logo-dot">.</span></span>
        </div>

        <div className="navbar-icons">
          <button className="icon-btn" aria-label="Search" onClick={() => nav('/search')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <button className="icon-btn" aria-label="Chat" onClick={handleChatClick}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>

          <button
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => setShowNotifs(!showNotifs)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="notif-dot"></span>}
          </button>
        </div>
      </header>

      {chatToast && (
        <div className="global-toast">
          💬 Campus Direct Messaging is currently in preview! Full chat coming soon.
        </div>
      )}

      <NotificationModal
        isOpen={showNotifs}
        onClose={() => {
          setShowNotifs(false);
          fetchUnreadCount();
        }}
        onCountUpdate={(cnt) => setUnreadCount(cnt)}
      />
    </>
  );
}

export default Navbar;