import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Bills from './pages/Bills'
import Investments from './pages/Investments'
import AdminPanel from './pages/AdminPanel'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import NavBar from './components/NavBar'

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />

        <Route
          path='/'
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path='/bills'
          element={
            <ProtectedRoute>
              <Bills />
            </ProtectedRoute>
          }
        />

        <Route
          path='/investments'
          element={
            <ProtectedRoute>
              <Investments />
            </ProtectedRoute>
          }
        />

        <Route
          path='/admin'
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        <Route path='*' element={<NotFound />} />
      </Routes>
    </>
  )
}

import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Dashboard";          // Etusivu
import AdminPanel from "./pages/AdminPanel"; // Admin-sivu

 {

    <Router>
      <nav style={{ padding: "10px", backgroundColor: "#eee" }}>
        <Link to="/" style={{ marginRight: "10px" }}>Etusivu</Link>
        <Link to="/adminpanel">Admin Panel</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/adminpanel" element={<AdminPanel />} />
      </Routes>
    </Router>
}

