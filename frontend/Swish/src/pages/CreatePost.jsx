 import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import "../components/Layout.css";
import api from "../services/api";

function CreatePost() {
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      return alert("Please select an image");
    }

    const formData = new FormData();
    formData.append("image", image);
    formData.append("caption", caption);

    try {
      setLoading(true);

      const res = await api.post("/api/posts/create", formData);

      alert(res.data.message);

      navigate("/home");
    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="profile-container">
          <h2>Create New Post</h2>

          <form onSubmit={handleSubmit} className="edit-form">

            <label>Choose Image</label>

            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setImage(e.target.files[0])}
            />

            {image && (
              <img
                src={URL.createObjectURL(image)}
                alt="preview"
                className="preview-image"
              />
            )}

            <label>Caption</label>

            <textarea
              rows="4"
              placeholder="What's happening on campus?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />

            <button className="save-btn" disabled={loading}>
              {loading ? "Uploading..." : "Share Post"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default CreatePost;