/**
 * useRBAC — Role-Based Access Control hook for TransitOps.
 *
 * Roles (from PRD Section 4.1 + backend UserRole enum):
 *   Manager    — full access to everything
 *   Dispatcher — can create/manage trips + send alerts; read-only on fleet/drivers
 *   Safety     — can manage pre/post trip logs + safety checklist; read-only elsewhere
 *   Finance    — can log fuel/expenses; read-only on everything else
 *
 * Usage:
 *   const { can, role, isManager } = useRBAC()
 *   if (can('create_vehicle')) { ... }
 */
import useAuthStore from './authStore'

// ── Permission definitions by role ────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  Manager: [
    'create_vehicle', 'edit_vehicle', 'delete_vehicle',
    'create_driver', 'edit_driver', 'delete_driver',
    'create_trip', 'dispatch_trip', 'complete_trip', 'cancel_trip', 'delete_trip',
    'complete_checklist',
    'create_maintenance', 'close_maintenance', 'delete_maintenance',
    'log_fuel', 'log_expense', 'delete_fuel', 'delete_expense',
    'send_alert',
    'manage_users',
    'view_analytics',
    'auto_assign',
  ],
  Dispatcher: [
    'create_trip', 'dispatch_trip', 'complete_trip', 'cancel_trip',
    'send_alert',
    'auto_assign',
    'view_analytics',
    'log_fuel', // Drivers need to log fuel
  ],
  Safety: [
    'complete_checklist',
    'create_maintenance', 'close_maintenance',
  ],
  Finance: [
    'log_fuel', 'log_expense', 'delete_fuel', 'delete_expense',
    'view_analytics',
  ],
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useRBAC() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role || ''

  const permissions = ROLE_PERMISSIONS[role] || []

  /**
   * Returns true if the current user has the given permission.
   * @param {string} action - e.g. 'create_vehicle', 'dispatch_trip'
   */
  const can = (action) => permissions.includes(action)

  return {
    role,
    can,
    isManager:    role === 'Manager',
    isDispatcher: role === 'Dispatcher',
    isSafety:     role === 'Safety',
    isFinance:    role === 'Finance',
    /** True if user is Manager (dispatch-capable role) */
    canDispatch:  role === 'Manager',
    /** True if user can manage fleet assets (vehicles/drivers) */
    canManageFleet: role === 'Manager',
    /** True if user can perform safety-related actions */
    canManageSafety: role === 'Manager' || role === 'Safety',
    /** True if user can log financial items */
    canManageFinance: role === 'Manager' || role === 'Finance',
  }
}
