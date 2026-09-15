import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Post.css";
import { getErrorMessage } from "../utils/getErrorMessage";

const Post = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });

  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("general");
  const [location, setLocation] = useState("");
  const [song, setSong] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const fetchPost = async () => {
    try {
      const res = await axios.get("http://localhost:3000/post", { withCredentials: true });
      setPost(res.data);
    } catch (err) {
      console.error("Error fetching post:", err);
      showToast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, []);

  const openModal = () => {
    setCaption("");
    setCategory("general");
    setLocation("");
    setSong("");
    setDriveLink("");
    setImages([]);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > 10) {
      showToast("You can only upload up to 10 images.", "error");
      return;
    }

    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        showToast(`${file.name} is larger than 2MB. Please choose smaller images.`, "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [...prev, reader.result].slice(0, 10));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const updatePollOption = (index, value) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const addPollOption = () => {
    if (pollOptions.length >= 6) {
      showToast("Maximum 6 options allowed", "error");
      return;
    }
    setPollOptions([...pollOptions, ""]);
  };

  const removePollOption = (index) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (category === "event") {
      if (!pollQuestion.trim()) {
        showToast("Please fill in the poll question, or switch category if you don't want a poll.", "error");
        return;
      }
      const filledOptions = pollOptions.filter((opt) => opt.trim() !== "");
      if (filledOptions.length < 2) {
        showToast("Please fill in at least 2 poll options.", "error");
        return;
      }
    }

    setSubmitting(true);

    const poll =
      category === "event"
        ? {
            question: pollQuestion,
            options: pollOptions
              .filter((opt) => opt.trim() !== "")
              .map((opt) => ({ text: opt, votes: 0 })),
          }
        : null;

    try {
      const res = await axios.post(
        "http://localhost:3000/post",
        {
          caption,
          images,
          category,
          location,
          song,
          poll,
          driveLink: category === "event" ? driveLink : "",
        },
        { withCredentials: true }
      );
      setPost(res.data);
      closeModal();
      showToast("Post created successfully!", "success");
    } catch (err) {
      console.error("Error creating post:", err);
      showToast(getErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="create-post-container">
        <p>Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="create-post-container">
      <button type="button" className="submit-post-btn" onClick={openModal}>
        + New Post
      </button>

      {toast.message && (
        <div className={`post-toast ${toast.type === "error" ? "post-toast-error" : "post-toast-success"}`}>
          {toast.message}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Post</h3>
            <form onSubmit={handleCreatePost} className="post-form">
              <div className="form-group">
                <label>Category</label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="general">General</option>
                  <option value="achievement">Achievement</option>
                  <option value="event">Event</option>
                </select>
              </div>

              {category === "event" && (
                <>
                  <div className="poll-section">
                    <p className="poll-section-title">Create a Poll (required for events)</p>

                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ask a question..."
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                    />

                    <div className="poll-options-builder">
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="poll-option-row">
                          <input
                            type="text"
                            className="form-input"
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={(e) => updatePollOption(idx, e.target.value)}
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              className="remove-option-btn"
                              onClick={() => removePollOption(idx)}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {pollOptions.length < 6 && (
                      <button type="button" className="add-poll-btn" onClick={addPollOption}>
                        + Add Option
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Event Photo Drive Link (optional)</label>
                    <div className="drive-input-wrapper">
                      <span className="drive-icon">📁</span>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="Paste Google Drive folder link..."
                        value={driveLink}
                        onChange={(e) => setDriveLink(e.target.value)}
                      />
                    </div>
                    <p className="drive-hint">
                      Attendees can upload their event photos to this shared folder. Make sure the folder's sharing setting allows "Anyone with the link" to upload.
                    </p>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Location</label>
                <div className="location-input-wrapper">
                  <span className="location-icon">📍</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add location (optional)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Song</label>
                <div className="song-input-wrapper">
                  <span className="song-icon">🎵</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add a song (optional)"
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Photos ({images.length}/10)</label>
                <label className="image-upload-box">
                  <span>+ Add Images</span>
                  <p>Select up to 10 images</p>
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={images.length >= 10} hidden />
                </label>

                {images.length > 0 && (
                  <div className="media-preview-carousel">
                    {images.map((imgSrc, idx) => (
                      <div key={idx} className="preview-item">
                        <img src={imgSrc} alt={`preview-${idx}`} />
                        <button type="button" className="remove-btn" onClick={() => removeImage(idx)}>×</button>
                        <span className="preview-badge">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Caption</label>
                <textarea
                  className="form-textarea"
                  placeholder="Write caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="submit" disabled={submitting}>{submitting ? "Publishing..." : "Publish"}</button>
                <button type="button" onClick={closeModal} disabled={submitting}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;