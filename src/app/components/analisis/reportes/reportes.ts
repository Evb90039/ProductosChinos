import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { EmpleadosService, Empleado } from '../../../services/empleados.service';
import { ProductosService } from '../../../services/productos.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';

export interface ReporteEmpleado {
  empleado: Empleado | null;
  productosVendidos: number;
  productosApartados: number;
  productosParciales: number;
  totalApartados: number;
  totalVendido: number;
  gananciaTotal: number;
  gananciaDueno: number;
}

interface ProductoVendido {
  conDevolucion?: boolean;
  porcentajeDevolucion?: number | null;
  precioPagina?: number | null;
  precioCompra?: number | null;
  dineroRembolsado?: number | null;
  vendidoPor?: string | null;
  vendido?: boolean;
  apartado?: boolean;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class ReportesComponent {
  private readonly empleadosService = inject(EmpleadosService);
  private readonly productosService = inject(ProductosService);

  readonly ultimaActualizacion = new Date();

  private static esJefeOSubJefa(empleado: Empleado | null): boolean {
    if (!empleado) return false;
    const pos = (empleado.position ?? '').trim().toLowerCase();
    return pos === 'jefe' || pos === 'sub jefa';
  }

  /**
   * Con devolución: Jefe/Sub Jefa no cuentan como empleado → 0 en Ganancia empleado (va a Mi ganancia).
   * Otros: mitad del % (ej. 80% → 40% empleado).
   * Sin devolución: 50% empleado. Base = solo Precio Página.
   */
  private static gananciaEmpleadoPorProducto(
    p: ProductoVendido,
    empleado: Empleado | null
  ): number {
    if (ReportesComponent.esJefeOSubJefa(empleado)) {
      return 0;
    }
    const base = p.precioPagina ?? 0;
    if (p.conDevolucion && p.porcentajeDevolucion != null) {
      return base * (p.porcentajeDevolucion / 2 / 100);
    }
    return base * 0.5;
  }

  /**
   * Cuando vende Jefe/Sub Jefa: va todo a Mi ganancia (100% siempre).
   * Cuando vende otro empleado: con devolución recibe mitad del % + resto hasta 100%;
   * sin devolución 50%.
   */
  private static gananciaDuenoPorProducto(
    p: ProductoVendido,
    empleado: Empleado | null
  ): number {
    const base = p.precioPagina ?? 0;
    if (ReportesComponent.esJefeOSubJefa(empleado)) {
      return base; // Jefe/Sub Jefa: 100% del precio página
    }
    if (p.conDevolucion && p.porcentajeDevolucion != null) {
      const mitadPorcentaje = p.porcentajeDevolucion / 2 / 100;
      const restoHastaCien = (100 - p.porcentajeDevolucion) / 100;
      return base * (mitadPorcentaje + restoHastaCien);
    }
    return base * 0.5;
  }

  /**
   * Precio neto del artículo (precioCompra - dineroRembolsado) solo si ya fue rembolsado (dineroRembolsado > 0).
   * Se resta de Mi ganancia.
   */
  private static precioNetoSiRembolsado(p: ProductoVendido): number {
    if (p.dineroRembolsado == null || p.dineroRembolsado <= 0) return 0;
    return (p.precioCompra ?? 0) - p.dineroRembolsado;
  }

  /** Mi ganancia neta por producto: ganancia dueño menos precio neto si ya fue rembolsado. */
  private static gananciaDuenoNetaPorProducto(
    p: ProductoVendido,
    empleado: Empleado | null
  ): number {
    return (
      ReportesComponent.gananciaDuenoPorProducto(p, empleado) -
      ReportesComponent.precioNetoSiRembolsado(p)
    );
  }

  readonly vista$ = combineLatest([
    this.empleadosService.obtenerEmpleadosActivos(),
    this.productosService.obtenerProductos(),
  ]).pipe(
    map(([empleados, productos]) => {
      const vendidos = productos.filter((p) => p.vendido);
      const apartados = productos.filter((p) => p.apartado);
      const nombresEmpleados = new Set(
        empleados.map((e) => (e.fullName ?? '').trim().toLowerCase())
      );

      const reportePorEmpleado: ReporteEmpleado[] = empleados.map((emp) => {
        const vendidosEmpleado = vendidos.filter(
          (p) =>
            (p.vendidoPor ?? '').trim().toLowerCase() ===
            (emp.fullName ?? '').trim().toLowerCase()
        );
        const apartadosEmpleado = apartados.filter(
          (p) =>
            (p.vendidoPor ?? '').trim().toLowerCase() ===
            (emp.fullName ?? '').trim().toLowerCase()
        );
        const productosParcialesEmp = vendidosEmpleado.filter(
          (p) => p.conDevolucion === true
        ).length;
        const totalVendido = vendidosEmpleado.reduce(
          (s, p) => s + (p.precioPagina ?? 0),
          0
        );
        const totalApartadosEmp = apartadosEmpleado.reduce(
          (s, p) => s + (p.precioPagina ?? 0),
          0
        );
        const gananciaTotalEmp = vendidosEmpleado.reduce(
          (s, p) => s + ReportesComponent.gananciaEmpleadoPorProducto(p, emp),
          0
        );
        const gananciaDuenoEmp = vendidosEmpleado.reduce(
          (s, p) => s + ReportesComponent.gananciaDuenoNetaPorProducto(p, emp),
          0
        );
        return {
          empleado: emp,
          productosVendidos: vendidosEmpleado.length,
          productosApartados: apartadosEmpleado.length,
          productosParciales: productosParcialesEmp,
          totalApartados: totalApartadosEmp,
          totalVendido,
          gananciaTotal: gananciaTotalEmp,
          gananciaDueno: gananciaDuenoEmp,
        };
      });

      const vendidosSinAsignar = vendidos.filter((p) => {
        const nombre = (p.vendidoPor ?? '').trim();
        return !nombre || !nombresEmpleados.has(nombre.toLowerCase());
      });
      if (vendidosSinAsignar.length > 0) {
        const totalVendidoSa = vendidosSinAsignar.reduce(
          (s, p) => s + (p.precioPagina ?? 0),
          0
        );
        const precioNetoRembolsadoSa = vendidosSinAsignar.reduce(
          (s, p) => s + ReportesComponent.precioNetoSiRembolsado(p),
          0
        );
        const productosParcialesSa = vendidosSinAsignar.filter(
          (p) => p.conDevolucion === true
        ).length;
        reportePorEmpleado.push({
          empleado: null,
          productosVendidos: vendidosSinAsignar.length,
          productosApartados: 0,
          productosParciales: productosParcialesSa,
          totalApartados: 0,
          totalVendido: totalVendidoSa,
          gananciaTotal: 0,
          gananciaDueno: totalVendidoSa - precioNetoRembolsadoSa,
        });
      }

      const gananciaTotal = reportePorEmpleado.reduce(
        (s, r) => s + r.gananciaTotal,
        0
      );
      const gananciaTotalDueno = reportePorEmpleado.reduce(
        (s, r) => s + r.gananciaDueno,
        0
      );

      const reportePorEmpleadoVisible = reportePorEmpleado
        .filter(
          (r) =>
            r.empleado === null ||
            r.productosVendidos > 0 ||
            r.productosApartados > 0
        )
        .sort((a, b) => b.totalVendido - a.totalVendido);

      return {
        empleadosActivos: empleados.length,
        productosVendidos: vendidos.length,
        productosApartados: apartados.length,
        gananciaTotal,
        gananciaTotalDueno,
        reportePorEmpleado: reportePorEmpleadoVisible,
      };
    })
  );

  getIniciales(fullName: string): string {
    if (!fullName?.trim()) return '?';
    const partes = fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (
      partes[0][0] + partes[partes.length - 1][0]
    ).toUpperCase();
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
