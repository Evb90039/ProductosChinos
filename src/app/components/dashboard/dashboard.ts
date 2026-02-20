import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProductosService, Producto } from '../../services/productos.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner';

export interface ProductoPendienteRembolso extends Producto {
  montoConDevolucion?: number | null; // precioCompra * (porcentajeDevolucion/100) si conDevolucion
}

export interface VendedorPendientes {
  nombreVendedor: string;
  productos: ProductoPendienteRembolso[];
  totalPendiente: number; // suma de precioCompra
}

export interface DashboardRembolso {
  cantidadPendientes: number;
  dineroPendiente: number;
  porVendedor: VendedorPendientes[];
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private readonly productosService = inject(ProductosService);

  /** Solo un vendedor abierto a la vez (acordeón). */
  readonly expandedVendedor = signal<string | null>(null);

  toggleVendedor(nombreVendedor: string): void {
    const current = this.expandedVendedor();
    this.expandedVendedor.set(current === nombreVendedor ? null : nombreVendedor);
  }

  readonly datos$: Observable<DashboardRembolso> = this.productosService.obtenerProductos().pipe(
    map((productos) => this.calcularRembolso(productos)),
    catchError((err) => {
      console.error('Error al cargar productos para dashboard:', err);
      return of({
        cantidadPendientes: 0,
        dineroPendiente: 0,
        porVendedor: [],
      });
    }),
    shareReplay(1)
  );

  private calcularRembolso(productos: Producto[]): DashboardRembolso {
    const pendientes = productos.filter(
      (p) => (p.precioCompra ?? 0) > 0 && (p.dineroRembolsado ?? 0) === 0
    );
    const dineroPendiente = pendientes.reduce((sum, p) => sum + (p.precioCompra ?? 0), 0);

    const conMontoDevolucion = pendientes.map((p) => {
      const item: ProductoPendienteRembolso = { ...p };
      if (p.conDevolucion && p.precioCompra != null && (p.porcentajeDevolucion ?? 0) > 0) {
        item.montoConDevolucion = (p.precioCompra * (p.porcentajeDevolucion ?? 0)) / 100;
      } else {
        item.montoConDevolucion = null;
      }
      return item;
    });

    const porNombre = new Map<string, ProductoPendienteRembolso[]>();
    for (const p of conMontoDevolucion) {
      const nombre = (p.nombreVendedor ?? '').trim() || 'Sin vendedor';
      if (!porNombre.has(nombre)) porNombre.set(nombre, []);
      porNombre.get(nombre)!.push(p);
    }

    const porVendedor: VendedorPendientes[] = [];
    porNombre.forEach((items, nombreVendedor) => {
      const totalPendiente = items.reduce((s, p) => s + (p.precioCompra ?? 0), 0);
      porVendedor.push({ nombreVendedor, productos: items, totalPendiente });
    });
    porVendedor.sort((a, b) => a.nombreVendedor.localeCompare(b.nombreVendedor));

    return {
      cantidadPendientes: pendientes.length,
      dineroPendiente,
      porVendedor,
    };
  }
}
