import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import { getErrorMessage } from '../utils/getErrorMessage';

function AdminDashboard() {
  let [students, setStudents] = useState([]);
  let [faculty, setFaculty] = useState([]);
  let [studentDept, setStudentDept] = useState("");
  let [studentStatus, setStudentStatus] = useState("");
  let [facultyDept, setFacultyDept] = useState("");
  let [facultyStatus, setFacultyStatus] = useState("");
  let [openMenuId, setOpenMenuId] = useState(null);
  let [warningTarget, setWarningTarget] = useState(null); // { id, name, isStudent }
  let [warningReason, setWarningReason] = useState("");
  let [sendingWarning, setSendingWarning] = useState(false);
  let [toast, setToast] = useState({ message: "", type: "" });

  let showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  let fetchStudents = () => {
    let params = {};
    if (studentDept) params.department = studentDept;
    if (studentStatus) params.status = studentStatus;
    axios.get("http://localhost:3000/admin/students", { params, withCredentials: true })
      .then((res) => setStudents(res.data))
      .catch((err) => showToast(getErrorMessage(err), "error"));
  };

  let fetchFaculty = () => {
    let params = {};
    if (facultyDept) params.department = facultyDept;
    if (facultyStatus) params.status = facultyStatus;
    axios.get("http://localhost:3000/admin/faculty", { params, withCredentials: true })
      .then((res) => setFaculty(res.data))
      .catch((err) => showToast(getErrorMessage(err), "error"));
  };

  useEffect(() => { fetchStudents(); }, [studentDept, studentStatus]);
  useEffect(() => { fetchFaculty(); }, [facultyDept, facultyStatus]);

  let approveFaculty = (id) => {
    axios.patch(`http://localhost:3000/admin/approve/${id}`, {}, { withCredentials: true })
      .then(() => {
        fetchFaculty();
        showToast("Faculty approved", "success");
      })
      .catch((err) => showToast(getErrorMessage(err), "error"));
  };

  let suspendUser = (id, isStudent) => {
    axios.patch(`http://localhost:3000/admin/suspend/${id}`, {}, { withCredentials: true })
      .then(() => {
        isStudent ? fetchStudents() : fetchFaculty();
        showToast("Account suspended", "success");
      })
      .catch((err) => showToast(getErrorMessage(err), "error"));
  };

  let reactivateUser = (id, isStudent) => {
    axios.patch(`http://localhost:3000/admin/reactivate/${id}`, {}, { withCredentials: true })
      .then(() => {
        isStudent ? fetchStudents() : fetchFaculty();
        showToast("Account reactivated", "success");
      })
      .catch((err) => showToast(getErrorMessage(err), "error"));
  };

  let promoteUser = (id) => {
    axios.patch(`http://localhost:3000/admin/promote/${id}`, {}, { withCredentials: true })
      .then(() => {
        fetchFaculty();
        showToast("Promoted to Admin", "success");
      })
      .catch((err) => showToast(getErrorMessage(err), "error"));
  };

  let openWarningModal = (id, name, isStudent) => {
    setWarningTarget({ id, name, isStudent });
    setWarningReason("");
    setOpenMenuId(null);
  };

  let closeWarningModal = () => {
    setWarningTarget(null);
    setWarningReason("");
  };

  let handleSendWarning = (e) => {
    e.preventDefault();
    if (!warningReason.trim()) {
      showToast("Please write a reason for the warning", "error");
      return;
    }

    setSendingWarning(true);
    axios.post(
      `http://localhost:3000/admin/warn/${warningTarget.id}`,
      { reason: warningReason.trim() },
      { withCredentials: true }
    )
      .then(() => {
        showToast(`Warning sent to ${warningTarget.name}`, "success");
        closeWarningModal();
      })
      .catch((err) => showToast(getErrorMessage(err), "error"))
      .finally(() => setSendingWarning(false));
  };

  return (
    <div className="admin-dashboard" onClick={() => setOpenMenuId(null)}>
      <h1>Admin Dashboard</h1>
      <Link to="/admin-posts" className="manage-posts-btn">
        Manage Posts
      </Link>

      {toast.message && (
        <div className={`admin-toast ${toast.type === "error" ? "admin-toast-error" : "admin-toast-success"}`}>
          {toast.message}
        </div>
      )}

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
              <th>Name</th><th>Email</th><th>College ID</th><th>Year</th><th>Status</th><th>Action</th><th></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
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
                  <td className="row-menu-cell">
                    <div className="row-menu-wrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="row-menu-dots"
                        onClick={() => setOpenMenuId(openMenuId === s._id ? null : s._id)}
                      >
                        ⋯
                      </button>
                      {openMenuId === s._id && (
                        <div className="row-menu-dropdown">
                          <button type="button" onClick={() => openWarningModal(s._id, s.fullname, true)}>
                            ⚠️ Send Warning
                          </button>
                        </div>
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
              <th>Name</th><th>Email</th><th>Department</th><th>Status</th><th>Action</th><th></th>
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
                <td className="row-menu-cell">
                  <div className="row-menu-wrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="row-menu-dots"
                      onClick={() => setOpenMenuId(openMenuId === f._id ? null : f._id)}
                    >
                      ⋯
                    </button>
                    {openMenuId === f._id && (
                      <div className="row-menu-dropdown">
                        <button type="button" onClick={() => openWarningModal(f._id, f.fullname, false)}>
                          ⚠️ Send Warning
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {warningTarget && (
        <div className="modal-overlay" onClick={closeWarningModal}>
          <div className="warning-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Send Warning</h3>
            <p className="warning-modal-subtitle">
              To <strong>{warningTarget.name}</strong> — explain why this account may be suspended if the behavior continues.
            </p>
            <form onSubmit={handleSendWarning}>
              <textarea
                placeholder="Write the reason for this warning..."
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="submit" disabled={sendingWarning}>
                  {sendingWarning ? "Sending..." : "Send Warning"}
                </button>
                <button type="button" onClick={closeWarningModal} disabled={sendingWarning}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;