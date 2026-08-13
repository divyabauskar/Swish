import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Form.css";

function Login() {
  let [email, setEmail] = useState("");
  let [password, setPassword] = useState("");
  let nav = useNavigate();
   
  
  let handleSubmit = (event) => {
    event.preventDefault();
    let obj = { email, password };
    axios
      .post("http://localhost:3000/login", obj, { withCredentials: true })
      .then((res) => {
        if( obj.accountStatus==="suspended"){
          alert(res.data.message || "Your Account is Suspended By Admin")
        }
        if(res.data.role === "Admin") {
          alert(res.data.message || "Login successful");
          nav("/admin-dashboard");
        }else{
        alert(res.data.message || "Login successful");
        nav("/Home");
        }
      })
      .catch((err) => alert(err.response?.data?.error || err.message));
  };

  return (
    <div className="form-container">
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
          Don't have an account? <a href="/Signup">Sign up</a>
        </p>
      </form>
    </div>
  );
}

export default Login;