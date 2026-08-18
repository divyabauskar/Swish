import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import "../components/Layout.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const Profile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/api/profile");
      setUser(res.data.user);
    } catch (err) {
      console.log(err);
    }
  };

  if (!user) return <h2>Loading...</h2>;

  return (
     
  <div className="page-wrapper">
    <BottomNav />

    <div className="app-shell">
      <Navbar />

      <div className="profile-container">
        <img
          src={user.profilePicture || "https://via.placeholder.com/120"}
          alt="profile"
          className="profile-image"
        />

        <h2>{user.fullName}</h2>

        <p className="username">@{user.username || "student"}</p>

        <div className="profile-info">
          <p>{user.bio || "No bio added"}</p>

          <p>
            <strong>College:</strong> {user.college || "-"}
          </p>

          <p>
            <strong>Course:</strong> {user.course || "-"}
          </p>

          <p>
            <strong>Email:</strong> {user.email}
          </p>
        </div>

        <Link to="/edit-profile" className="edit-btn">
          Edit Profile
        </Link>
      </div>
    </div>
  </div>

  );
};

export default Profile;