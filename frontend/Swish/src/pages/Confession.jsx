import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import "../components/Layout.css";
import api from "../services/api";

function Confession() {
  const [text, setText] = useState("");
  const [confessions, setConfessions] = useState([]);

  useEffect(() => {
    fetchConfessions();
  }, []);

  const fetchConfessions = async () => {
    try {
      const res = await api.get("/api/confessions");
      setConfessions(res.data.confessions);
    } catch (err) {
      console.log(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim()) return alert("Write something first!");

    try {
      await api.post("/api/confessions/create", { text });

      setText("");
      fetchConfessions();

      alert("Confession posted anonymously!");
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="profile-container">
          <h2>Anonymous Confession 🎭</h2>
          <p className="username">
            Nobody will know who posted this.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              rows="5"
              placeholder="Share your confession..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="confession-input"
            />

            <button className="save-btn">
              Post Anonymously
            </button>
          </form>
        </div>

        <div className="feed-placeholder">
          {confessions.map((item) => (
            <div className="confession-card" key={item._id}>
              <div className="confession-header">
                🎭 Anonymous Student
              </div>

              <p>{item.text}</p>

              <small>
                {new Date(item.createdAt).toLocaleString()}
              </small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Confession;