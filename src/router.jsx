import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from './layouts/ProtectedRoute'

// Pages
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import NotFoundPage from './pages/NotFoundPage'
import SignupPage from './pages/SignupPage'

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import PatientInsightPage from './pages/doctor/PatientInsightPage'
import RegisterPatientPage from './pages/doctor/RegisterPatientPage'

// Patient pages
import UnifiedDashboard from './pages/patient/UnifiedDashboard'
import PhysicalSession from './pages/patient/PhysicalSession'
import CognitiveHub from './pages/patient/CognitiveHub'
import PatientProgressView from './pages/patient/PatientProgressView'

const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },

  // ── Doctor routes ──────────────────────────────────────────
  {
    path: '/doctor/dashboard',
    element: (
      <ProtectedRoute requiredRole="doctor">
        <DoctorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor/patient/:userId',
    element: (
      <ProtectedRoute requiredRole="doctor">
        <PatientInsightPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor/register-patient',
    element: (
      <ProtectedRoute requiredRole="doctor">
        <RegisterPatientPage />
      </ProtectedRoute>
    ),
  },

  // ── Patient routes ─────────────────────────────────────────
  {
    path: '/patient/hub',
    element: (
      <ProtectedRoute requiredRole="patient">
        <UnifiedDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/session/physical',
    element: (
      <ProtectedRoute requiredRole="patient">
        <PhysicalSession />
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/session/cognitive',
    element: (
      <ProtectedRoute requiredRole="patient">
        <CognitiveHub />
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/progress',
    element: (
      <ProtectedRoute requiredRole="patient">
        <PatientProgressView />
      </ProtectedRoute>
    ),
  },

  // ── 404 catch-all ──────────────────────────────────────────
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
