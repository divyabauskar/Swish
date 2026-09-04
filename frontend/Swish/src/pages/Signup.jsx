import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Form.css';
import axios from 'axios';

function Signup() {
    let [fullname, setFullname] = useState("");
    let [email, setEmail] = useState("");
    let [studentId, setStudentId] = useState("");
    let [password, setPassword] = useState("");
    let [confirmPassword, setConfirmPassword] = useState("");
    let [role, setRole] = useState("Student");
    let [year, setYear] = useState("");
    let [department, setDepartment] = useState("");
    let nav = useNavigate();

    let handleSubmit = (event) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        let obj = { fullname, email, studentId, password, role, year, department };
        axios
            .post("http://localhost:3000/register", obj)
            .then((res) => {
                alert(res.data.message || "Registered successfully");
                nav("/login");
            })
            .catch((err) => alert(err.response?.data?.error || err.message));
    };

    return (
        <div className="form-container">
            <form className="form-card" onSubmit={handleSubmit}>
                <h2>Create Account</h2>
                <p className="form-subtitle">Join your campus community</p>

                <label htmlFor="fullname">Full Name</label>
                <input id="fullname" type="text" value={fullname}
                    onChange={(e) => setFullname(e.target.value)} required />

                <label htmlFor="email">College Email</label>
                <input id="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required />

                <label htmlFor="department">Department</label>
                <select id="department" value={department} onChange={(e) => setDepartment(e.target.value)} required>
                            <option value="">Select Department</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Information Technology">Information Technology </option>
                            <option value="Electrical Engineering">Electrical Engineering</option>
                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                            <option value="Civil Engineering">Civil Engineering</option>
                            <option value="AIDS">AIDS</option>
                            <option value="AIML">AIML</option>
                        </select>

                 <label htmlFor="role">I am a</label>
                <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Admin">Admin</option>
                </select>

                {role === "Student" && ( 
                    <> <label htmlFor="studentId">College ID</label> 
                     < input id="studentId" type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} required/>
                     </> 
                    )}

                {role === "Student" && (
                    <>
                        <label htmlFor="year">Year</label>
                        <select id="year" value={year} onChange={(e) => setYear(e.target.value)}>
                            <option value="">Select Year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                        
                    </>
                )}

               


                <label htmlFor="password">Password</label>
                <input id="password" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} required />

                <label htmlFor="confirmPassword">Confirm Password</label>
                <input id="confirmPassword" type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} required />

                <button type="submit">Sign Up</button>
                <p className="form-footer">
                    Already have an account? <a href="/login">Log in</a>
                </p>
            </form>
        </div>
    );
}

export default Signup;