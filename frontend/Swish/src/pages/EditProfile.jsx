 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import "../components/Layout.css";
import api from "../services/api";

function EditProfile() {
  const navigate = useNavigate();

  const [image, setImage] = useState(null);

  const [form, setForm] = useState({
    bio: "",
    college: "",
    course: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const res = await api.get("/api/profile");

    setForm({
      bio: res.data.user.bio || "",
      college: res.data.user.college || "",
      course: res.data.user.course || "",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();

    data.append("bio", form.bio);
    data.append("college", form.college);
    data.append("course", form.course);

    if (image) {
      data.append("profilePicture", image);
    }

    try {
      await api.put("/api/profile/update", data);

      alert("Profile Updated Successfully");

      navigate("/profile");
    } catch (err) {
      alert("Update Failed");
      console.log(err);
    }
  };

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="profile-container">

          <h2>Edit Profile</h2>

          <form onSubmit={handleSubmit} className="edit-form">

            <label>Profile Picture</label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />

            <label>Bio</label>

            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows="4"
            />

            <label>College</label>

            <input
              type="text"
              name="college"
              value={form.college}
              onChange={handleChange}
            />

            <label>Course</label>

            <input
              type="text"
              name="course"
              value={form.course}
              onChange={handleChange}
            />

            <button className="save-btn">
              Save Changes
            </button>

          </form>

        </div>
      </div>
    </div>
  );
}

export default EditProfile;