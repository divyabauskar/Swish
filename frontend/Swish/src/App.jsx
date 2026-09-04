import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Post from './pages/Post';  
import MyPosts from './pages/MyPosts';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-dashboard" element={<Admin />} />
        <Route path="/home" element={<Home/>}/>
        <Route path="/profile" element={<Profile />} />
        <Route path="/create" element={<Post />} />
        <Route path="/my-posts" element={<MyPosts />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;