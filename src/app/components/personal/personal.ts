import { Component, ViewChild, ElementRef, inject, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { DeficitRegistroModalComponent, type RegistroGuardadoEvent } from '../../shared/modals/deficit-registro-modal/deficit-registro-modal';
import { DeficitService, RegistroDeficit, PerfilTDEE } from '@app/services/deficit.service';
import { NotificationService } from '@app/services/notification.service';
import { NotificationComponent } from '../../shared/components/notification/notification';
import { SpinnerComponent } from '../../shared/components/spinner/spinner';

declare var bootstrap: any;

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Component({
  selector: 'app-personal',
  imports: [
    CommonModule,
    FormsModule,
    NotificationComponent,
    SpinnerComponent,
    DeficitRegistroModalComponent,
  ],
  templateUrl: './personal.html',
  styleUrl: './personal.scss',
})
export class PersonalComponent implements AfterViewInit {
  @ViewChild(DeficitRegistroModalComponent) deficitModal!: DeficitRegistroModalComponent;
  @ViewChild('modalPerfil') modalPerfilElement!: ElementRef<HTMLDivElement>;

  private readonly deficitService = inject(DeficitService);
  private readonly notificationService = inject(NotificationService);
  private readonly refresh$ = new Subject<void>();

  /** Observable de registros: el template usa async pipe para que la vista se actualice al cargar. */
  readonly registros$: Observable<RegistroDeficit[]> = this.refresh$.pipe(
    startWith(undefined),
    switchMap(() => this.deficitService.obtenerRegistros())
  );
  readonly saving = signal(false);
  private modalPerfilInstance: any;

  perfil: PerfilTDEE | null = null;
  perfilForm: Partial<PerfilTDEE> = {};

  ngAfterViewInit(): void {
    if (this.modalPerfilElement?.nativeElement && typeof bootstrap !== 'undefined') {
      this.modalPerfilInstance = new bootstrap.Modal(this.modalPerfilElement.nativeElement);
    }
  }

  constructor() {
    this.deficitService.getPerfil().then((p) => (this.perfil = p));
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

  /**
   * Clase para mostrar cómo distribuyes las calorías en cada comida.
   * Verde = bien distribuido, naranja = aceptable, rojo = desequilibrado.
   * Basado en % del total del día: desayuno 20-30%, comida 35-45%, cena 25-35%.
   */
  mealDistributionClass(r: RegistroDeficit, meal: 'desayuno' | 'comida' | 'cena'): 'meal-green' | 'meal-orange' | 'meal-red' | null {
    const total = this.totalCal(r);
    if (total <= 0) return null;
    const cal = meal === 'desayuno' ? (r.desayunoCal ?? 0) : meal === 'comida' ? (r.comidaCal ?? 0) : (r.cenaCal ?? 0);
    const pct = (cal / total) * 100;
    if (meal === 'desayuno') {
      if (pct >= 20 && pct <= 30) return 'meal-green';
      if (pct >= 15 && pct < 20 || pct > 30 && pct <= 35) return 'meal-orange';
      return 'meal-red';
    }
    if (meal === 'comida') {
      if (pct >= 35 && pct <= 45) return 'meal-green';
      if (pct >= 30 && pct < 35 || pct > 45 && pct <= 55) return 'meal-orange';
      return 'meal-red';
    }
    // cena
    if (pct >= 25 && pct <= 35) return 'meal-green';
    if (pct >= 20 && pct < 25 || pct > 35 && pct <= 40) return 'meal-orange';
    return 'meal-red';
  }

  /**
   * Clase para la proteína: verde/naranja/rojo según g/kg de peso.
   * Verde: 1.2–2.0 g/kg · Naranja: 1.0–1.2 o 2.0–2.5 · Rojo: fuera de rango.
   */
  proteinDistributionClass(r: RegistroDeficit): 'meal-green' | 'meal-orange' | 'meal-red' | null {
    const peso = r.pesoKg ?? 0;
    const proteina = r.proteinaG ?? 0;
    if (peso <= 0 || proteina < 0) return null;
    const gPerKg = proteina / peso;
    if (gPerKg >= 1.2 && gPerKg <= 2.0) return 'meal-green';
    if ((gPerKg >= 1.0 && gPerKg < 1.2) || (gPerKg > 2.0 && gPerKg <= 2.5)) return 'meal-orange';
    return 'meal-red';
  }

  abrirModal(): void {
    this.deficitModal.abrir();
  }

  editarRegistro(r: RegistroDeficit): void {
    this.deficitModal.abrirParaEditar(r);
  }

  /** Recibe datos del modal: si trae id, actualiza; si no, agrega. */
  async guardarRegistro(data: RegistroGuardadoEvent): Promise<void> {
    const id = data.id;
    this.saving.set(true);
    try {
      if (id) {
        const { id: _id, ...datos } = data;
        await this.deficitService.actualizarRegistro(id, datos);
        this.refresh$.next();
        this.notificationService.show('Registro actualizado correctamente', 'success', 3000);
      } else {
        await this.deficitService.agregarRegistro(data);
        this.refresh$.next();
        this.notificationService.show('Registro agregado correctamente', 'success', 3000);
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      this.notificationService.show('Error al guardar el registro', 'error', 3000);
    } finally {
      this.saving.set(false);
      this.deficitModal.cerrar();
    }
  }

  onAbrirPerfilClick(): void {
    this.deficitModal.cerrar();
    this.abrirModalPerfil();
  }

  async eliminar(id: string): Promise<void> {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await this.deficitService.eliminarRegistro(id);
      this.refresh$.next();
      this.notificationService.show('Registro eliminado', 'success', 2000);
    } catch (err) {
      console.error('Error al eliminar:', err);
      this.notificationService.show('Error al eliminar el registro', 'error', 3000);
    }
  }

  formatNum(value: number | null | undefined): string {
    if (value == null) return '—';
    return String(value);
  }

  async abrirModalPerfil(): Promise<void> {
    this.perfil = await this.deficitService.getPerfil();
    this.perfilForm = this.perfil
      ? { ...this.perfil }
      : { alturaCm: 170, edad: 30, sexo: 'M' };
    if (!this.modalPerfilInstance && this.modalPerfilElement?.nativeElement && typeof bootstrap !== 'undefined') {
      this.modalPerfilInstance = new bootstrap.Modal(this.modalPerfilElement.nativeElement);
    }
    this.modalPerfilInstance?.show();
  }

  cerrarModalPerfil(): void {
    try {
      this.modalPerfilInstance?.hide();
    } catch {
      const el = this.modalPerfilElement?.nativeElement;
      if (el) {
        el.classList.remove('show');
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
      }
    }
  }

  async guardarPerfil(): Promise<void> {
    const p = this.perfilForm;
    const alturaCm = p.alturaCm != null ? Number(p.alturaCm) : NaN;
    const edad = p.edad != null ? Number(p.edad) : NaN;
    const sexo = p.sexo === 'M' || p.sexo === 'F' ? p.sexo : 'M';
    if (Number.isNaN(alturaCm) || alturaCm < 100 || alturaCm > 250) {
      this.notificationService.show('Altura debe estar entre 100 y 250 cm', 'error', 3000);
      return;
    }
    if (Number.isNaN(edad) || edad < 10 || edad > 120) {
      this.notificationService.show('Edad debe estar entre 10 y 120 años', 'error', 3000);
      return;
    }
    const perfil: PerfilTDEE = { alturaCm, edad, sexo };
    try {
      await this.deficitService.savePerfil(perfil);
      this.perfil = perfil;
      this.cerrarModalPerfil();
      this.notificationService.show('Datos para TDEE guardados', 'success', 2000);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      this.notificationService.show('Error al guardar. Inicia sesión e inténtalo de nuevo.', 'error', 3000);
    }
  }
}
