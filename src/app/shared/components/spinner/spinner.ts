import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.html',
  styleUrls: ['./spinner.scss'],
})
export class SpinnerComponent {
  /** Mensaje opcional bajo el spinner */
  @Input() message: string = 'Cargando...';

  /** 'inline' = solo el spinner; 'overlay' = pantalla completa con fondo; 'block' = bloque con fondo semitransparente */
  @Input() mode: 'inline' | 'overlay' | 'block' = 'inline';

  /** Tamaño: 'sm' | 'md' | 'lg' */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
