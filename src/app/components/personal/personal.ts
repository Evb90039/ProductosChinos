import { Component, ViewChild, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { DeficitRegistroModalComponent, type RegistroGuardadoEvent } from '../../shared/modals/deficit-registro-modal/deficit-registro-modal';
import { DeficitPerfilModalComponent } from '../../shared/modals/deficit-perfil-modal/deficit-perfil-modal';
import { DeficitService, RegistroDeficit, PerfilTDEE, kcalDesdePasos } from '@app/services/deficit.service';
import { NotificationService } from '@app/services/notification.service';
import { NotificationComponent } from '../../shared/components/notification/notification';
import { SpinnerComponent } from '../../shared/components/spinner/spinner';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NotificationComponent,
    SpinnerComponent,
    DeficitRegistroModalComponent,
    DeficitPerfilModalComponent,
  ],
  templateUrl: './personal.html',
  styleUrl: './personal.scss',
})
export class PersonalComponent implements OnInit {
  @ViewChild(DeficitRegistroModalComponent) deficitModal!: DeficitRegistroModalComponent;
  @ViewChild(DeficitPerfilModalComponent) perfilModal!: DeficitPerfilModalComponent;

  private readonly deficitService = inject(DeficitService);
  private readonly notificationService = inject(NotificationService);
  private readonly refresh$ = new Subject<void>();

  readonly registros$: Observable<RegistroDeficit[]> = this.refresh$.pipe(
    startWith(undefined),
    switchMap(() => this.deficitService.obtenerRegistros())
  );
  readonly saving = signal(false);

  perfil: PerfilTDEE | null = null;

  ngOnInit(): void {
    this.deficitService.getPerfil().then((p) => {
      this.perfil = p;
    });
    setTimeout(() => this.deficitService.getPerfil().then((p) => {
      if (p && !this.perfil) this.perfil = p;
    }), 500);
  }

  onPerfilGuardado(): void {
    this.deficitService.getPerfil().then((p) => {
      this.perfil = p;
    });
  }

  diaSemana(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return DIAS[d.getDay()] ?? '';
  }

  totalCal(r: RegistroDeficit): number {
    return (r.desayunoCal ?? 0) + (r.comidaCal ?? 0) + (r.cenaCal ?? 0);
  }

  deficitCal(r: RegistroDeficit): number | null {
    const tdee = r.tdeeCal ?? 0;
    const total = this.totalCal(r);
    if (tdee <= 0) return null;
    return tdee - total;
  }

  /** Semáforo del déficit: verde = buen déficit (>300), amarillo = déficit bajo (0-300), rojo = sin déficit (≤0). */
  deficitSemaforo(r: RegistroDeficit): 'verde' | 'amarillo' | 'rojo' | null {
    const d = this.deficitCal(r);
    if (d == null) return null;
    if (d > 300) return 'verde';
    if (d > 0) return 'amarillo';
    return 'rojo';
  }

  /** Semáforo por comida: verde = rango adecuado, amarillo = bajo o algo alto, rojo = muy bajo o muy alto. */
  semaforoComida(cal: number | null | undefined, tipo: 'desayuno' | 'comida' | 'cena'): 'verde' | 'amarillo' | 'rojo' | null {
    const c = cal == null ? 0 : Number(cal);
    if (Number.isNaN(c)) return null;
    if (c === 0) return null; // sin dato, no mostrar semáforo
    const ranges = {
      desayuno: { verde: [200, 500], amarilloBajo: [50, 200], amarilloAlto: [500, 700] },
      comida: { verde: [400, 900], amarilloBajo: [150, 400], amarilloAlto: [900, 1100] },
      cena: { verde: [250, 600], amarilloBajo: [80, 250], amarilloAlto: [600, 800] },
    };
    const { verde, amarilloBajo, amarilloAlto } = ranges[tipo];
    if (c >= verde[0] && c <= verde[1]) return 'verde';
    if ((c >= amarilloBajo[0] && c < amarilloBajo[1]) || (c > amarilloAlto[0] && c <= amarilloAlto[1])) return 'amarillo';
    return 'rojo';
  }

  abrirModal(): void {
    this.deficitModal.abrir();
  }

  editarRegistro(r: RegistroDeficit): void {
    this.deficitModal.abrirParaEditar(r);
  }

  async guardarRegistro(data: RegistroGuardadoEvent): Promise<void> {
    const id = data.id;
    this.saving.set(true);
    try {
      if (id) {
        const { id: _id, ...datos } = data;
        await this.deficitService.actualizarRegistro(id, datos);
        this.refresh$.next();
        this.notificationService.show('Registro actualizado', 'success', 3000);
      } else {
        await this.deficitService.agregarRegistro(data);
        this.refresh$.next();
        this.notificationService.show('Registro guardado', 'success', 3000);
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      this.notificationService.show('Error al guardar', 'error', 3000);
    } finally {
      this.saving.set(false);
      this.deficitModal.cerrar();
    }
  }

  onAbrirPerfilClick(): void {
    this.deficitModal.cerrar();
    this.perfilModal?.abrir();
  }

  async eliminar(id: string): Promise<void> {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await this.deficitService.eliminarRegistro(id);
      this.refresh$.next();
      this.notificationService.show('Registro eliminado', 'success', 2000);
    } catch (err) {
      console.error('Error al eliminar:', err);
      this.notificationService.show('Error al eliminar', 'error', 3000);
    }
  }

  formatNum(value: number | null | undefined): string {
    if (value == null) return '—';
    return String(value);
  }

  kcalFromPasos(r: RegistroDeficit): number | null {
    return kcalDesdePasos(r.pasosReales, r.pesoKg, this.perfil);
  }

}
