import { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

function AdminDashboard() {
  let [students, setStudents] = useState([]);
  let [faculty, setFaculty] = useState([]);
  let [studentDept, setStudentDept] = useState("");
  let [studentStatus, setStudentStatus] = useState("");
  let [facultyDept, setFacultyDept] = useState("");
  let [facultyStatus, setFacultyStatus] = useState("");

  let fetchStudents = () => {
    let params = {};
    if (studentDept) params.department = studentDept;
    if (studentStatus) params.status = studentStatus;
    axios.get("http://localhost:3000/admin/students", { params, withCredentials: true })
      .then((res) => setStudents(res.data))
      .catch((err) => alert(err.response?.data || err.message));
  };

  let fetchFaculty = () => {
    let params = {};
    if (facultyDept) params.department = facultyDept;
    if (facultyStatus) params.status = facultyStatus;
    axios.get("http://localhost:3000/admin/faculty", { params, withCredentials: true })
      .then((res) => setFaculty(res.data))
      .catch((err) => alert(err.response?.data || err.message));
  };

  useEffect(() => { fetchStudents(); }, [studentDept, studentStatus]);
  useEffect(() => { fetchFaculty(); }, [facultyDept, facultyStatus]);

  let approveFaculty = (id) => {
    axios.patch(`http://localhost:3000/admin/approve/${id}`, {}, { withCredentials: true })
      .then(() => fetchFaculty())
      .catch((err) => alert(err.response?.data || err.message));
  };

  let suspendUser = (id, isStudent) => {
    axios.patch(`http://localhost:3000/admin/suspend/${id}`, {}, { withCredentials: true })
      .then(() => isStudent ? fetchStudents() : fetchFaculty())
      .catch((err) => alert(err.response?.data || err.message));
  };

 let reactivateUser = (id, isStudent) => {
  axios.patch(`http://localhost:3000/admin/reactivate/${id}`, {}, { withCredentials: true })
    .then(() => isStudent ? fetchStudents() : fetchFaculty())
    .catch((err) => alert(err.response?.data || err.message));
};

  let promoteUser = (id) => {
    axios.patch(`http://localhost:3000/admin/promote/${id}`, {}, { withCredentials: true })
      .then(() => fetchFaculty())
      .catch((err) => alert(err.response?.data || err.message));
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <section>
        <h2>Students</h2>
        <select value={studentDept} onChange={(e) => setStudentDept(e.target.value)}>
          <option value="">All Departments</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Information Technology">Information Technology</option>
          <option value="Electrical Engineering">Electrical Engineering</option>
          <option value="Mechanical Engineering">Mechanical Engineering</option>
          <option value="AIDS">AIDS</option>
          <option value="AIML">AIML</option>
        </select>

        <select value={studentStatus} onChange={(e) => setStudentStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>College ID</th><th>Year</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              // fallback for old records created before accountStatus existed
              let status = s.accountStatus || "active";
              return (
                <tr key={s._id}>
                  <td>{s.fullname}</td>
                  <td>{s.email}</td>
                  <td>{s.studentId}</td>
                  <td>{s.year}</td>
                  <td>
                    <span className={`status-badge status-${status}`}>
                      {status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {status === "active" && (
                        <button className="btn-suspend" onClick={() => suspendUser(s._id, true)}>
                          Suspend
                        </button>
                      )}
                      {status === "suspended" && (
                        <button className="btn-reactivate" onClick={() => reactivateUser(s._id, true)}>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Faculty</h2>
        <select value={facultyDept} onChange={(e) => setFacultyDept(e.target.value)}>
          <option value="">All Departments</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Information Technology">Information Technology</option>
          <option value="Electrical Engineering">Electrical Engineering</option>
          <option value="Mechanical Engineering">Mechanical Engineering</option>
          <option value="AIDS">AIDS</option>
          <option value="AIML">AIML</option>
        </select>

        <select value={facultyStatus} onChange={(e) => setFacultyStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {faculty.map((f) => (
              <tr key={f._id}>
                <td>{f.fullname}</td>
                <td>{f.email}</td>
                <td>{f.department}</td>
                <td>
                  <span className={`status-badge status-${f.accountStatus}`}>
                    {f.accountStatus}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {f.accountStatus === "pending" && (
                      <button className="btn-approve" onClick={() => approveFaculty(f._id)}>
                        Approve
                      </button>
                    )}
                    {f.accountStatus === "active" && (
                      <button className="btn-suspend" onClick={() => suspendUser(f._id, false)}>
                        Suspend
                      </button>
                    )}
                    {f.accountStatus === "suspended" && (
                      <button className="btn-reactivate" onClick={() => reactivateUser(f._id, false)}>
                        Reactivate
                      </button>
                    )}
                    {f.role !== "Admin" && (
                      <button className="btn-promote" onClick={() => promoteUser(f._id)}>
                        Promote to Admin
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default AdminDashboard;