import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './spinner.component.css',
  template: `
    <span
      class="spinner"
      [class.spinner--sm]="size() === 'sm'"
      [class.spinner--md]="size() === 'md'"
      [class.spinner--lg]="size() === 'lg'"
      role="status"
      [attr.aria-label]="label()"
    >
      <span class="sr-only">{{ label() }}</span>
    </span>
  `,
})
export class SpinnerComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly label = input('Cargando…');
}
