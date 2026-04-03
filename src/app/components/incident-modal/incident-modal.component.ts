import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { IncidentService } from '../../services/incident.service';
import { UsersService } from '../../services/users.service';

const MAX_RECIPIENTS = 2;

@Component({
  selector: 'app-incident-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent, FormFieldComponent],
  templateUrl: './incident-modal.component.html',
  styleUrl: './incident-modal.component.css',
})
export class IncidentModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly incidentService = inject(IncidentService);
  private readonly usersService = inject(UsersService);

  readonly userEmail = input<string | null>(null);
  readonly closed = output<void>();
  readonly reported = output<void>();

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly success = signal(false);
  readonly selectedRecipients = signal<string[]>([]);

  readonly technicians = computed(() =>
    this.usersService.users()
  );

  readonly loadingTechnicians = this.usersService.loading;

  readonly recipientsError = computed(() => {
    const selected = this.selectedRecipients();
    if (this._recipientsTouched() && selected.length === 0) {
      return 'Selecciona al menos un técnico a notificar.';
    }
    return null;
  });

  private readonly _recipientsTouched = signal(false);

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    severity: ['', Validators.required],
  });

  get titleCtrl() { return this.form.controls.title; }
  get descriptionCtrl() { return this.form.controls.description; }
  get severityCtrl() { return this.form.controls.severity; }

  ngOnInit(): void {
    this.usersService.load();
  }

  isSelected(email: string): boolean {
    return this.selectedRecipients().includes(email);
  }

  isDisabled(email: string): boolean {
    return !this.isSelected(email) && this.selectedRecipients().length >= MAX_RECIPIENTS;
  }

  toggleRecipient(email: string): void {
    this._recipientsTouched.set(true);
    this.selectedRecipients.update(current => {
      if (current.includes(email)) {
        return current.filter(e => e !== email);
      }
      if (current.length >= MAX_RECIPIENTS) return current;
      return [...current, email];
    });
  }

  titleError(): string | null {
    if (!this.titleCtrl.touched) return null;
    if (this.titleCtrl.hasError('required')) return 'El título es obligatorio.';
    if (this.titleCtrl.hasError('maxlength')) return 'Máximo 120 caracteres.';
    return null;
  }

  descriptionError(): string | null {
    if (!this.descriptionCtrl.touched) return null;
    if (this.descriptionCtrl.hasError('required')) return 'La descripción es obligatoria.';
    if (this.descriptionCtrl.hasError('maxlength')) return 'Máximo 1000 caracteres.';
    return null;
  }

  severityError(): string | null {
    if (!this.severityCtrl.touched) return null;
    if (this.severityCtrl.hasError('required')) return 'Selecciona un nivel de severidad.';
    return null;
  }

  submit(): void {
    this.form.markAllAsTouched();
    this._recipientsTouched.set(true);
    if (this.form.invalid || this.submitting() || this.selectedRecipients().length === 0) return;

    this.submitting.set(true);
    this.submitError.set(null);

    const { title, description, severity } = this.form.getRawValue();

    this.incidentService.report({
      title: title!,
      description: description!,
      severity: severity as 'low' | 'medium' | 'high',
      reportedBy: this.userEmail() ?? undefined,
      notifyEmails: this.selectedRecipients(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.reported.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('No se pudo enviar el incidente. Inténtalo de nuevo.');
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
