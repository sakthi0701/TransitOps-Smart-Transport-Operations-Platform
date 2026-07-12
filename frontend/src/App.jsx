import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Fleet from './pages/Fleet'
import Drivers from './pages/Drivers'
import Dispatch from './pages/Dispatch'
import Maintenance from './pages/Maintenance'
import FuelExpense from './pages/FuelExpense'

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
        <Route path="dispatch" element={<Dispatch />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="fuel" element={<FuelExpense />} />
        {/* Phase 3-4 routes — placeholder until built */}
        <Route path="analytics" element={<ComingSoon title="Analytics & Reports" />} />
        <Route path="leaderboard" element={<ComingSoon title="Eco Leaderboard" />} />
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
      <p className="text-slate-400">Coming in Phase 3 — stay tuned!</p>
    </div>
  )
}
