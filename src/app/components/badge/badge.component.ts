import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant =
  // Maintenance type
  | 'preventive'
  | 'corrective'
  | 'predictive'
  // Maintenance / task status
  | 'pending'
  | 'in-progress'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'skipped'
  // Machine status
  | 'active'
  | 'inactive'
  | 'under_maintenance'
  | 'maintenance'
  // User roles
  | 'admin'
  | 'technician'
  | 'supervisor';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './badge.component.css',
  template: `
    <span
      class="badge"
      [class.badge--preventive]="variant() === 'preventive'"
      [class.badge--corrective]="variant() === 'corrective'"
      [class.badge--predictive]="variant() === 'predictive'"
      [class.badge--pending]="variant() === 'pending'"
      [class.badge--in-progress]="variant() === 'in-progress' || variant() === 'in_progress'"
      [class.badge--completed]="variant() === 'completed'"
      [class.badge--cancelled]="variant() === 'cancelled'"
      [class.badge--skipped]="variant() === 'skipped'"
      [class.badge--active]="variant() === 'active'"
      [class.badge--inactive]="variant() === 'inactive'"
      [class.badge--maintenance]="variant() === 'maintenance' || variant() === 'under_maintenance'"
      [class.badge--admin]="variant() === 'admin'"
      [class.badge--technician]="variant() === 'technician'"
      [class.badge--supervisor]="variant() === 'supervisor'"
    >
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly variant = input.required<BadgeVariant>();
}
