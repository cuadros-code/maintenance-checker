import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './button.component.css',
  template: `
    <button
      class="btn"
      [class.btn--primary]="variant() === 'primary'"
      [class.btn--secondary]="variant() === 'secondary'"
      [class.btn--ghost]="variant() === 'ghost'"
      [class.btn--danger]="variant() === 'danger'"
      [type]="type()"
      [disabled]="disabled()"
    >
      <ng-content class="icon" select="[slot=icon]" />
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
}
