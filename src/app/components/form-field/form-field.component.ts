import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './form-field.component.css',
  template: `
    <div class="form-field">
      <label class="form-field__label" [for]="forId()">{{ label() }}</label>
      <ng-content />
      @if (error()) {
        <span class="form-field__error" role="alert">{{ error() }}</span>
      } @else if (hint()) {
        <span class="form-field__hint">{{ hint() }}</span>
      }
    </div>
  `,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly forId = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}
