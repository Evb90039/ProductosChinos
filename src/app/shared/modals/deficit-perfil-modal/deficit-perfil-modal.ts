import { Component, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeficitService, PerfilTDEE } from '@app/services/deficit.service';
import { NotificationService } from '@app/services/notification.service';

declare var bootstrap: any;

@Component({
  selector: 'app-deficit-perfil-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deficit-perfil-modal.html',
  styleUrl: './deficit-perfil-modal.scss',
})
export class DeficitPerfilModalComponent implements AfterViewInit {
  @ViewChild('perfilModal') modalElement!: ElementRef<HTMLDivElement>;
  @Input() perfil: PerfilTDEE | null = null;
  @Output() perfilGuardado = new EventEmitter<void>();

  private readonly deficitService = inject(DeficitService);
  private readonly notificationService = inject(NotificationService);

  private modalInstance: any;
  saving = false;
  perfilForm = { alturaCm: 170, edad: 30, sexo: 'M' as 'M' | 'F' };

  ngAfterViewInit(): void {
    if (this.modalElement?.nativeElement && typeof bootstrap !== 'undefined') {
      this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement);
    }
  }

  abrir(): void {
    if (this.perfil) {
      this.perfilForm = { alturaCm: this.perfil.alturaCm, edad: this.perfil.edad, sexo: this.perfil.sexo };
    } else {
      this.perfilForm = { alturaCm: 170, edad: 30, sexo: 'M' };
    }
    this.deficitService.getPerfil().then((p) => {
      if (p) {
        this.perfilForm = { alturaCm: p.alturaCm, edad: p.edad, sexo: p.sexo };
      }
      setTimeout(() => this.modalInstance?.show(), 0);
    });
  }

  cerrar(): void {
    this.modalInstance?.hide();
  }

  async guardarPerfil(): Promise<void> {
    const p = this.perfilForm;
    const alturaCm = Number(p.alturaCm);
    const edad = Number(p.edad);
    const sexo = p.sexo === 'F' ? 'F' : 'M';
    if (Number.isNaN(alturaCm) || alturaCm < 100 || alturaCm > 250) {
      this.notificationService.show('Altura entre 100 y 250 cm', 'error', 3000);
      return;
    }
    if (Number.isNaN(edad) || edad < 10 || edad > 120) {
      this.notificationService.show('Edad entre 10 y 120 años', 'error', 3000);
      return;
    }
    const perfil: PerfilTDEE = { alturaCm, edad, sexo };
    this.saving = true;
    try {
      await this.deficitService.savePerfil(perfil);
      this.cerrar();
      this.perfilGuardado.emit();
      this.notificationService.show('Perfil guardado', 'success', 2000);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      this.notificationService.show('Error al guardar perfil', 'error', 3000);
    } finally {
      this.saving = false;
    }
  }
}
