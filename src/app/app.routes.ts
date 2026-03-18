import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./views/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./views/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./views/dashboard-home/dashboard-home.component').then((m) => m.DashboardHomeComponent),
      },
      {
        path: 'equipos',
        loadComponent: () =>
          import('./views/machines/machines.component').then((m) => m.MachinesComponent),
      },
      {
        path: 'mantenimientos',
        loadComponent: () =>
          import('./views/maintenance-view/maintenance-view').then((m) => m.MaintenanceView),
      },
      {
        path: 'mantenimientos/:id/tareas',
        loadComponent: () =>
          import('./views/maintenance-tasks-view/maintenance-tasks-view').then((m) => m.MaintenanceTasksView),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./views/users-view/users-view').then((m) => m.UsersView),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./views/landing/landing.component').then((m) => m.LandingComponent),
  },
  { path: '**', redirectTo: '' },
];
