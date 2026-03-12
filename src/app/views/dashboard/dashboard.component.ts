import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/auth.store';
import { SupabaseService } from '../../services/supabase.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  readonly auth = inject(AuthStore);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly loggingOut = signal(false);
  readonly sidebarOpen = signal(false);

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
