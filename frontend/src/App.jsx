import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Fleet from './pages/Fleet'
import Drivers from './pages/Drivers'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="fleet" element={<Fleet />} />
        <Route path="drivers" element={<Drivers />} />
        {/* Phase 2-4 routes — placeholder until built */}
        <Route path="dispatch" element={<ComingSoon title="Dispatch" />} />
        <Route path="maintenance" element={<ComingSoon title="Maintenance" />} />
        <Route path="analytics" element={<ComingSoon title="Analytics" />} />
        <Route path="leaderboard" element={<ComingSoon title="Leaderboard" />} />
        <Route path="driver-view" element={<ComingSoon title="Driver View" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="text-6xl">🚧</div>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-slate-400">Coming in Phase 2 — stay tuned!</p>
    </div>
  )
}
