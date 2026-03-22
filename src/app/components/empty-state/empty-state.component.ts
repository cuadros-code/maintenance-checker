import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent],
  styleUrl: './empty-state.component.css',
  template: `
    <div
      class="empty-state"
      role="status"
      [attr.aria-live]="loading() ? 'polite' : null"
    >
      @if (loading()) {
        <app-spinner size="lg" />
      }
      <p class="empty-state__text">{{ loading() ? loadingText() : text() }}</p>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly loading = input(false);
  readonly text = input('No hay datos.');
  readonly loadingText = input('Cargando…');
}
