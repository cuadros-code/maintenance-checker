import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  readonly auth = inject(AuthStore);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly loggingOut = signal(false);

  signOut(): void {
    this.loggingOut.set(true);
    this.supabase.signOut().subscribe({
      next: () => {
        this.auth.clear();
        this.router.navigate(['/login']);
      },
    });
  }
}
