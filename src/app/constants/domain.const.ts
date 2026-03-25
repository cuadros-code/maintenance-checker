// ── Maintenance type ──────────────────────────────────────────────────────
export type MaintenanceType = 'preventive' | 'corrective' | 'predictive';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventivo',
  corrective: 'Correctivo',
  predictive: 'Predictivo',
};

export const MAINTENANCE_TYPE_OPTIONS: { value: MaintenanceType; label: string }[] = [
  { value: 'preventive', label: 'Preventivo' },
  { value: 'corrective', label: 'Correctivo' },
  { value: 'predictive', label: 'Predictivo' },
];

// ── Maintenance status ────────────────────────────────────────────────────
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  pending:     'Pendiente',
  in_progress: 'En progreso',
  completed:   'Completado',
  cancelled:   'Cancelado',
};

export const MAINTENANCE_STATUS_OPTIONS: { value: MaintenanceStatus; label: string }[] = [
  { value: 'pending',     label: 'Pendiente'   },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed',   label: 'Completado'  },
  { value: 'cancelled',   label: 'Cancelado'   },
];

// ── Task status ───────────────────────────────────────────────────────────
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending:     'Pendiente',
  in_progress: 'En progreso',
  completed:   'Completado',
  skipped:     'Omitida',
};

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending',     label: 'Pendiente'   },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed',   label: 'Completado'  },
  { value: 'skipped',     label: 'Omitida'     },
];

// ── Machine status ────────────────────────────────────────────────────────
export type MachineStatus = 'active' | 'inactive' | 'under_maintenance';

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  active:            'Activo',
  inactive:          'Inactivo',
  under_maintenance: 'En mantenimiento',
};

export const MACHINE_STATUS_OPTIONS: { value: MachineStatus; label: string }[] = [
  { value: 'active',            label: 'Activo'            },
  { value: 'inactive',          label: 'Inactivo'          },
  { value: 'under_maintenance', label: 'En mantenimiento'  },
];
