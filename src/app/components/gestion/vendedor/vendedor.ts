import { Component, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, Subject } from 'rxjs';
import { map, shareReplay, catchError, startWith, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { VendedorModalComponent } from '../../../shared/modals/vendedor-modal/vendedor-modal';
import { VendedoresService, Vendedor } from '../../../services/vendedores.service';
import { VendedorGuardadoEvent } from '../../../shared/modals/vendedor-modal/vendedor-modal';
import { NotificationComponent } from '../../../shared/components/notification/notification';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-vendedor',
  imports: [CommonModule, VendedorModalComponent, NotificationComponent, SpinnerComponent],
  templateUrl: './vendedor.html',
  styleUrls: ['./vendedor.scss'],
})
export class VendedorComponent {
  @ViewChild(VendedorModalComponent) vendedorModal!: VendedorModalComponent;

  private readonly vendedoresService = inject(VendedoresService);
  private readonly notificationService = inject(NotificationService);

  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  private readonly refresh$ = new Subject<void>();

  readonly vendedores$ = this.refresh$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.vendedoresService.obtenerVendedoresActivos().pipe(
        catchError((err) => {
          console.error('Error al cargar vendedores:', err);
          this.errorMessage.set('Error al cargar vendedores.');
          return of([]);
        })
      )
    ),
    shareReplay(1)
  );

  readonly vista$ = combineLatest([
    this.vendedores$,
    toObservable(this.searchTerm).pipe(startWith('')),
  ]).pipe(
    map(([vendedores, term]) => {
      const filtered = !term.trim()
        ? vendedores
        : vendedores.filter((v) => {
            const t = term.toLowerCase();
            return v.nombre.toLowerCase().includes(t) || v.telefono.toLowerCase().includes(t);
          });
      return { filtered, total: vendedores.length };
    })
  );

  abrirModal() {
    this.vendedorModal.abrir();
  }

  editarVendedor(vendedor: Vendedor) {
    this.vendedorModal.abrirParaEditar(vendedor);
  }

  async guardarVendedor(event: VendedorGuardadoEvent) {
    try {
      if (event.id) {
        const { id: _id, ...datos } = event;
        await this.vendedoresService.actualizarVendedor(event.id, datos);
        this.refresh$.next();
        this.notificationService.show('Vendedor actualizado correctamente', 'success', 3000);
      } else {
        await this.vendedoresService.agregarVendedor(event);
        this.refresh$.next();
        this.notificationService.show('Vendedor agregado correctamente', 'success', 3000);
      }
    } catch (error) {
      console.error('Error al guardar vendedor:', error);
      this.notificationService.show('Error al guardar el vendedor', 'error', 3000);
    }
  }

  async eliminarVendedor(id: string) {
    if (!confirm('¿Estás seguro de eliminar este vendedor?')) return;
    try {
      await this.vendedoresService.eliminarVendedor(id);
      this.refresh$.next();
      this.notificationService.show('Vendedor eliminado correctamente', 'success', 3000);
    } catch (error) {
      console.error('Error al eliminar vendedor:', error);
      this.notificationService.show('Error al eliminar el vendedor', 'error', 3000);
    }
  }

  filtrarVendedores(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  getIniciales(nombre: string): string {
    if (!nombre?.trim()) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }
}
