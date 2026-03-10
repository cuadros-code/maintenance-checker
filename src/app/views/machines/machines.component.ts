import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-machines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './machines.component.html',
  styleUrl: './machines.component.css',
})
export class MachinesComponent {}
