import { Component, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, Subject } from 'rxjs';
import { map, shareReplay, catchError, startWith, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { EmpleadoModalComponent } from '../../../shared/modals/empleado-modal/empleado-modal';
import { EmpleadosService, Empleado } from '../../../services/empleados.service';
import { EmpleadoGuardadoEvent } from '../../../shared/modals/empleado-modal/empleado-modal';
import { NotificationComponent } from '../../../shared/components/notification/notification';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-empleado',
  imports: [CommonModule, EmpleadoModalComponent, NotificationComponent, SpinnerComponent],
  templateUrl: './empleado.html',
  styleUrls: ['./empleado.scss'],
})
export class EmpleadoComponent {
  @ViewChild(EmpleadoModalComponent) empleadoModal!: EmpleadoModalComponent;

  private readonly empleadosService = inject(EmpleadosService);
  private readonly notificationService = inject(NotificationService);

  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  private readonly refresh$ = new Subject<void>();

  /** Recarga la lista (getDocs no es en tiempo real; hay que refrescar tras agregar/eliminar). */
  readonly empleados$ = this.refresh$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.empleadosService.obtenerEmpleadosActivos().pipe(
        catchError((err) => {
          console.error('Error al cargar empleados:', err);
          this.errorMessage.set('Error al cargar empleados.');
          return of([]);
        })
      )
    ),
    shareReplay(1)
  );

  /** Emite { filtered, total } para la vista (lista filtrada + total para estadísticas). */
  readonly vista$ = combineLatest([
    this.empleados$,
    toObservable(this.searchTerm).pipe(startWith('')),
  ]).pipe(
    map(([empleados, term]) => {
      const filtered =
        !term.trim()
          ? empleados
          : empleados.filter((e) => {
              const t = term.toLowerCase();
              return (
                e.fullName.toLowerCase().includes(t) ||
                e.position.toLowerCase().includes(t) ||
                e.department.toLowerCase().includes(t)
              );
            });
      return { filtered, total: empleados.length };
    })
  );

  abrirModal() {
    this.empleadoModal.abrir();
  }

  editarEmpleado(empleado: Empleado) {
    this.empleadoModal.abrirParaEditar(empleado);
  }

  async guardarEmpleado(event: EmpleadoGuardadoEvent) {
    try {
      if (event.id) {
        const { id: _id, ...datos } = event;
        await this.empleadosService.actualizarEmpleado(event.id, datos);
        this.refresh$.next();
        this.notificationService.show('Empleado actualizado correctamente', 'success', 3000);
      } else {
        await this.empleadosService.agregarEmpleado(event);
        this.refresh$.next();
        this.notificationService.show('Empleado agregado correctamente', 'success', 3000);
      }
    } catch (error) {
      console.error('Error al guardar empleado:', error);
      this.notificationService.show('Error al guardar el empleado', 'error', 3000);
    }
  }

  async eliminarEmpleado(id: string) {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) return;
    try {
      await this.empleadosService.eliminarEmpleado(id);
      this.refresh$.next();
      this.notificationService.show('Empleado eliminado correctamente', 'success', 3000);
    } catch (error) {
      console.error('Error al eliminar empleado:', error);
      this.notificationService.show('Error al eliminar el empleado', 'error', 3000);
    }
  }

  filtrarEmpleados(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  /** Iniciales del nombre para el avatar (ej: "Marisela Vizcarra" → "MV"). */
  getIniciales(fullName: string): string {
    if (!fullName?.trim()) return '?';
    const partes = fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
}
