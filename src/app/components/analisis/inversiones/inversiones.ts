import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { map, shareReplay, catchError, startWith, combineLatest } from 'rxjs';
import { of } from 'rxjs';
import { ProductosService, Producto } from '../../../services/productos.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';

/** Nombres que reciben 100% del ingreso (como en Reportes: Jefe/Sub Jefa). */
const NOMBRES_100_PORCIENTO = [
  'enrique vizcarra beltrán',
  'merali elizabeth torres valenzuela',
];

export interface ProductoVendidoResumen {
  id?: string;
  nombreProducto: string;
  nombreVendedor: string;
  vendidoPor: string;
  inversion: number;   // precioCompra - dineroRembolsado
  ingreso: number;     // parte del dueño (100% si vende Enrique/Merali, si no 50% o % devolución)
  ganancia: number;
  porcentajeRendimiento: number | null;
}

export interface InversionesVista {
  totalProductosVendidos: number;
  totalInvertido: number;
  totalIngresos: number;
  gananciaTotal: number;
  porcentajeRendimiento: number | null;
  roiPromedio: number | null;
  costoPromedioPorArticulo: number | null;
  productos: ProductoVendidoResumen[];
}

export interface InversionesVistaPagina extends InversionesVista {
  paginated: ProductoVendidoResumen[];
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
}

@Component({
  selector: 'app-inversiones',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './inversiones.html',
  styleUrl: './inversiones.scss',
})
export class InversionesComponent {
  private readonly productosService = inject(ProductosService);

  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 5;

  readonly vista$: Observable<InversionesVista> = this.productosService.obtenerProductos().pipe(
    map((productos) => this.calcularInversiones(productos)),
    catchError((err) => {
      console.error('Error al cargar productos para inversiones:', err);
      return of({
        totalProductosVendidos: 0,
        totalInvertido: 0,
        totalIngresos: 0,
        gananciaTotal: 0,
        porcentajeRendimiento: null,
        roiPromedio: null,
        costoPromedioPorArticulo: null,
        productos: [],
      });
    }),
    shareReplay(1)
  );

  readonly vistaPagina$: Observable<InversionesVistaPagina> = combineLatest([
    this.vista$,
    toObservable(this.searchTerm).pipe(startWith('')),
    toObservable(this.currentPage).pipe(startWith(1)),
  ]).pipe(
    map(([vista, term, page]) => {
      const t = term.trim().toLowerCase();
      const filtered = !t
        ? vista.productos
        : vista.productos.filter(
            (p) =>
              p.nombreProducto?.toLowerCase().includes(t) ||
              p.nombreVendedor?.toLowerCase().includes(t) ||
              p.vendidoPor?.toLowerCase().includes(t)
          );
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
      const current = Math.min(Math.max(1, page), totalPages);
      const start = (current - 1) * this.pageSize;
      const paginated = filtered.slice(start, start + this.pageSize);
      return {
        ...vista,
        paginated,
        currentPage: current,
        totalPages,
        totalFiltered: total,
      };
    })
  );

  filtrarInversiones(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    this.currentPage.set(page);
  }

  formatMoney(value: number): string {
    return '$' + value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** True si este vendedor (empleado) recibe 100% para el dueño (Enrique o Merali). */
  private static recibe100PorCiento(vendidoPor: string | null | undefined): boolean {
    const name = (vendidoPor ?? '').trim().toLowerCase();
    return NOMBRES_100_PORCIENTO.some((n) => n === name);
  }

  /**
   * Ingreso del dueño por producto: mismo criterio que Reportes.
   * 100% si vendido por Enrique Vizcarra Beltrán o Merali Elizabeth Torres Valenzuela.
   * Si no: con devolución = mitad del % + resto hasta 100%; sin devolución = 50%.
   */
  private static ingresoDuenoPorProducto(p: Producto): number {
    const base = p.precioPagina ?? 0;
    if (InversionesComponent.recibe100PorCiento(p.vendidoPor)) {
      return base;
    }
    if (p.conDevolucion && p.porcentajeDevolucion != null) {
      const mitadPorcentaje = p.porcentajeDevolucion / 2 / 100;
      const restoHastaCien = (100 - p.porcentajeDevolucion) / 100;
      return base * (mitadPorcentaje + restoHastaCien);
    }
    return base * 0.5;
  }

  private calcularInversiones(productos: Producto[]): InversionesVista {
    const vendidos = productos.filter((p) => p.vendido === true);
    const productosResumen: ProductoVendidoResumen[] = vendidos.map((p) => {
      const inversion = (p.precioCompra ?? 0) - (p.dineroRembolsado ?? 0);
      const ingreso = InversionesComponent.ingresoDuenoPorProducto(p);
      const ganancia = ingreso - inversion;
      const porcentajeRendimiento = inversion > 0 ? (ganancia / inversion) * 100 : null;
      return {
        id: p.id,
        nombreProducto: p.nombreProducto ?? '',
        nombreVendedor: p.nombreVendedor ?? '',
        vendidoPor: (p.vendidoPor ?? '').trim() || '—',
        inversion,
        ingreso,
        ganancia,
        porcentajeRendimiento,
      };
    });
    const totalInvertido = productosResumen.reduce((s, p) => s + p.inversion, 0);
    const totalIngresos = productosResumen.reduce((s, p) => s + p.ingreso, 0);
    const gananciaTotal = totalIngresos - totalInvertido;
    const porcentajeRendimiento = totalInvertido > 0 ? (gananciaTotal / totalInvertido) * 100 : null;
    const conRendimiento = productosResumen.filter((p) => p.porcentajeRendimiento != null);
    const roiPromedio =
      conRendimiento.length > 0
        ? conRendimiento.reduce((s, p) => s + (p.porcentajeRendimiento ?? 0), 0) / conRendimiento.length
        : null;
    const costoPromedioPorArticulo =
      vendidos.length > 0 ? totalInvertido / vendidos.length : null;
    return {
      totalProductosVendidos: vendidos.length,
      totalInvertido,
      totalIngresos,
      gananciaTotal,
      porcentajeRendimiento,
      roiPromedio,
      costoPromedioPorArticulo,
      productos: productosResumen,
    };
  }
}
