 import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import PostCard from "../components/PostCard";
import "../components/Layout.css";
import api from "../services/api";

function Home() {
  const [posts, setPosts] = useState([]);

  const stories = ["Coding Club", "Aarav", "Drama Soc", "Debate"];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await api.get("/api/posts");
      setPosts(res.data.posts);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="page-wrapper">
      <BottomNav />

      <div className="app-shell">
        <Navbar />

        <div className="feed-header">
          <p className="eyebrow">For You</p>
          <h1>Happening on campus</h1>
          <p className="subtext">
            Tuned to the accounts you follow, plus what campus can't stop talking about.
          </p>
        </div>

        <div className="stories-row">
          <div className="story story-add">
            <div className="story-ring add-ring">+</div>
            <span>Your Story</span>
          </div>

          {stories.map((name) => (
            <div className="story" key={name}>
              <div className="story-ring"></div>
              <span>{name}</span>
            </div>
          ))}
        </div>

        <div className="feed-placeholder">
          {posts.length === 0 ? (
            <p style={{ textAlign: "center", color: "#777" }}>
              No posts yet. Create your first post!
            </p>
          ) : (
            posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;