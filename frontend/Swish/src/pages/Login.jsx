import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Form.css";
import { getErrorMessage } from '../utils/getErrorMessage';

function Login() {
  let [email, setEmail] = useState("");
  let [password, setPassword] = useState("");
  let [toast, setToast] = useState({ message: "", type: "" });
  let nav = useNavigate();

  let showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  let handleSubmit = (event) => {
    event.preventDefault();
    let obj = { email, password };

    axios
      .post("http://localhost:3000/login", obj, { withCredentials: true })
      .then((res) => {
        showToast(res.data.message || "Login successful", "success");

        // small delay so the user actually sees the success toast before navigating away
        setTimeout(() => {
          if (res.data.role === "Admin") {
            nav("/admin-dashboard");
          } else {
            nav("/home");
          }
        }, 800);
      })
      .catch((err) => {
        showToast(getErrorMessage(err), "error");
      });
  };

  return (
    <div className="form-container">
      {toast.message && (
        <div className={`login-toast ${toast.type === "error" ? "login-toast-error" : "login-toast-success"}`}>
          {toast.message}
        </div>
      )}

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>
        <p className="form-subtitle">Log in to your campus account</p>

        <label htmlFor="email">College Email</label>
        <input
          id="email"
          type="email"
          placeholder="you@college.edu.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Log In</button>
        <p className="form-footer">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </form>
    </div>
  );
}

export default Login;