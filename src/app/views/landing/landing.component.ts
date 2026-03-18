import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface MockupRow {
  id: number;
  equipo: string;
  tipo: 'preventive' | 'corrective' | 'predictive';
  tipoLabel: string;
  estado: 'completed' | 'in-progress' | 'pending';
  estadoLabel: string;
  fecha: string;
}

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  readonly mockupRows: MockupRow[] = [
    { id: 1, equipo: 'Compresor A-01', tipo: 'preventive', tipoLabel: 'Preventivo', estado: 'completed', estadoLabel: 'Completado', fecha: 'Mar 12' },
    { id: 2, equipo: 'Bomba Hidráulica', tipo: 'corrective', tipoLabel: 'Correctivo', estado: 'in-progress', estadoLabel: 'En progreso', fecha: 'Mar 14' },
    { id: 3, equipo: 'Motor Eléctrico B', tipo: 'predictive', tipoLabel: 'Predictivo', estado: 'pending', estadoLabel: 'Pendiente', fecha: 'Mar 18' },
    { id: 4, equipo: 'Generador B-02', tipo: 'preventive', tipoLabel: 'Preventivo', estado: 'pending', estadoLabel: 'Pendiente', fecha: 'Mar 20' },
  ];
}
