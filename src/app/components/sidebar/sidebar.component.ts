import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MaintenanceService } from '../../services/maintenance.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly maintenanceService = inject(MaintenanceService);

  readonly open = input(false);
  readonly closed = output<void>();

  readonly upcomingCount = this.maintenanceService.upcomingCount;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',       route: '/dashboard',                 icon: 'dashboard' },
    { label: 'Mantenimientos',  route: '/dashboard/mantenimientos',  icon: 'settings'  },
    { label: 'Equipos',         route: '/dashboard/equipos',         icon: 'build'     },
    { label: 'Técnicos',        route: '/dashboard/usuarios',        icon: 'groups'    },
  ];

  constructor() {
    this.maintenanceService.load();
  }
}
