 import { NavLink, useNavigate } from "react-router-dom";
import "./Layout.css";

function BottomNav() {
  const nav = useNavigate();

  return (
    <nav className="bottom-nav">
      <div className="sidebar-logo" onClick={() => nav("/home")}>
        <span className="logo-mark">S</span>
        <span className="logo-word">
          swish<span className="logo-dot">.</span>
        </span>
      </div>

      {/* Home */}
      <NavLink to="/home" className="nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>Home</span>
      </NavLink>

      {/* Create */}
      <NavLink to="/create-post" className="nav-item nav-create">
        <span className="create-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span>Create</span>
      </NavLink>

      {/* Confession */}
      <NavLink to="/confessions" className="nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Confess</span>
      </NavLink>

      {/* Profile */}
      <NavLink to="/profile" className="nav-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}

export default BottomNav;