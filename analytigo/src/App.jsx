import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Landing from './pages/Landing.jsx'
import Tennis from './pages/Tennis.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pickleball" element={<Landing />} />
      {/* keep old links working */}
      <Route path="/landing" element={<Navigate to="/pickleball" replace />} />
      <Route path="/tennis" element={<Tennis />} />
    </Routes>
  )
}
