import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
  readonly open = input(false);
  readonly closed = output<void>();

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard',
    },
    {
      label: 'Mantenimientos',
      route: '/dashboard/mantenimientos',
      icon: 'settings'
    },
    {
      label: 'Equipos',
      route: '/dashboard/equipos',
      icon: 'build',
    },
    {
      label: 'Técnicos',
      route: '/dashboard/usuarios',
      icon: 'groups',
    },
    
  ];
}
