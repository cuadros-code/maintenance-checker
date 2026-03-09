import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { AuthStore } from '../../core/auth.store';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {

  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  auth = inject(AuthStore)

  readonly form = this.fb.group({
    email   : ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly emailInvalid = signal(false);
  readonly passwordInvalid = signal(false);

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');

    const { email, password } = this.form.controls;
    email.markAsTouched();
    password.markAsTouched();
    this.emailInvalid.set(email.invalid);
    this.passwordInvalid.set(password.invalid);

    if (this.form.invalid) return;

    this.loading.set(true);
    const { error } = await this.supabase.signInWithPassword(
      email.value!,
      password.value!,
    );
    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
