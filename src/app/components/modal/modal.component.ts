import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  readonly titleId = `modal-title-${++nextId}`;

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal__backdrop')) {
      this.closed.emit();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
