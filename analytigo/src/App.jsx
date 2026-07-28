import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Landing from './pages/Landing.jsx'
import Tennis from './pages/Tennis.jsx'
import { Suspense, lazy } from 'react'
import Auth from './pages/Auth.jsx'
import Cams from './pages/Cams.jsx'
import Analytics from './pages/Analytics.jsx'
import Tools from './pages/Tools.jsx'
import Contact from './pages/Contact.jsx'
import Legal from './pages/Legal.jsx'
import DeleteAccount from './pages/DeleteAccount.jsx'
import Careers from './pages/Careers.jsx'
import JobDetail from './pages/JobDetail.jsx'
// preview-only route — kept out of the main bundle
const LoadLab = lazy(() => import('./pages/LoadLab.jsx'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pickleball" element={<Landing />} />
      {/* keep old links working */}
      <Route path="/landing" element={<Navigate to="/pickleball" replace />} />
      <Route path="/tennis" element={<Tennis />} />
      {/* Analytics opens over the Tennis page rather than navigating away, but
          still gets a real URL so it is linkable and Back works. */}
      <Route path="/tennis/analytics" element={<Tennis />} />
      {/* the old external dashboard link */}
      <Route path="/tennis/upload" element={<Navigate to="/tennis/analytics" replace />} />
      <Route path="/signin" element={<Auth mode="signin" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      {/* Explore */}
      <Route path="/cams" element={<Cams />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/tools" element={<Tools />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/careers/:id" element={<JobDetail />} />
      {/* Legal */}
      <Route path="/terms" element={<Legal doc="terms" />} />
      <Route path="/privacy" element={<Legal doc="privacy" />} />
      <Route path="/refunds" element={<Legal doc="refunds" />} />
      <Route path="/delete-account" element={<DeleteAccount />} />
      {/* preview harness for the four loading screens — not linked from the site */}
      <Route path="/loadlab" element={<Suspense fallback={null}><LoadLab /></Suspense>} />
    </Routes>
  )
}
