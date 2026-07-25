import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Landing from './pages/Landing.jsx'
import Tennis from './pages/Tennis.jsx'
import Auth from './pages/Auth.jsx'
import LoadLab from './pages/LoadLab.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pickleball" element={<Landing />} />
      {/* keep old links working */}
      <Route path="/landing" element={<Navigate to="/pickleball" replace />} />
      <Route path="/tennis" element={<Tennis />} />
      <Route path="/signin" element={<Auth mode="signin" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      {/* preview harness for the four loading screens — not linked from the site */}
      <Route path="/loadlab" element={<LoadLab />} />
    </Routes>
  )
}
