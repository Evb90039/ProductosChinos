import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { ProductosService, Producto } from '../../../services/productos.service';

/** Mismo criterio que en Gestión > Productos: "En catálogo". */
function enCatalogo(p: Producto): boolean {
  return !p.apartado && !p.vendido && !p.regalado && (p.precioPagina != null && p.precioPagina !== 0);
}

export interface VistaCatalogo {
  productos: Producto[];
  categorias: { value: string; label: string }[];
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class CatalogoComponent {
  private readonly productosService = inject(ProductosService);

  /** Categoría seleccionada para filtrar: '' = Todas. */
  readonly selectedCategoria = signal<string>('');
  /** Término de búsqueda (nombre de producto, vendedor, tienda). */
  readonly searchTerm = signal<string>('');
  /** Panel de categorías abierto/cerrado. */
  readonly showCategoriasDropdown = signal<boolean>(false);

  /** Productos en catálogo (sin filtrar por categoría). */
  private readonly productosEnCatalogo$: Observable<Producto[]> = this.productosService.obtenerProductos().pipe(
    map((productos) => productos.filter(enCatalogo)),
    catchError((err) => {
      console.error('Error al cargar catálogo:', err);
      return of([]);
    })
  );

  /** Vista con productos filtrados por categoría y búsqueda. Solo se muestran categorías que tengan al menos un producto. */
  readonly vistaCatalogo$: Observable<VistaCatalogo> = combineLatest([
    this.productosEnCatalogo$,
    toObservable(this.selectedCategoria).pipe(startWith('')),
    toObservable(this.searchTerm).pipe(startWith('')),
  ]).pipe(
    map(([productos, cat, term]: [Producto[], string, string]) => {
      const categoriasConProductos = Array.from(new Set(productos.map((p: Producto) => p.categoria ?? '').filter(Boolean))).sort();
      const categorias = [
        { value: '', label: 'Todas' },
        ...categoriasConProductos.map((c) => ({ value: c, label: c })),
      ];
      let list = cat ? productos.filter((p: Producto) => (p.categoria ?? '') === cat) : productos;
      const t = (term ?? '').trim().toLowerCase();
      if (t) {
        list = list.filter(
          (p: Producto) =>
            p.nombreProducto?.toLowerCase().includes(t) ||
            p.nombreVendedor?.toLowerCase().includes(t) ||
            p.tienda?.toLowerCase().includes(t)
        );
      }
      return { productos: list, categorias };
    })
  );

  /** URL de la imagen principal del producto (o null si no hay). */
  imagenPrincipal(producto: Producto): string | null {
    const urls = producto.imagenesUrls ?? [];
    const idx = producto.imagenPrincipalIndex ?? 0;
    return urls[idx] ?? urls[0] ?? null;
  }

  formatPrecio(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Etiqueta de ganancia: "50% ganancia" estándar o "XX% devolución" (mitad del % de devolución).
   */
  etiquetaGanancia(producto: Producto): string {
    if (producto.conDevolucion && producto.porcentajeDevolucion != null) {
      const mitad = Math.round(producto.porcentajeDevolucion / 2);
      return `${mitad}% devolución`;
    }
    return '50% ganancia';
  }

  setCategoria(value: string): void {
    this.selectedCategoria.set(value);
  }

  toggleCategoriasDropdown(): void {
    this.showCategoriasDropdown.update((v) => !v);
  }

  setCategoriaAndClose(value: string): void {
    this.selectedCategoria.set(value);
    this.showCategoriasDropdown.set(false);
  }

  /** Etiqueta de la categoría seleccionada para el botón. */
  categoriasButtonLabel(vista: VistaCatalogo): string {
    const cat = this.selectedCategoria();
    if (!cat) return 'Todas las categorías';
    const found = vista.categorias.find((c) => c.value === cat);
    return found?.label ?? 'Todas las categorías';
  }
}
