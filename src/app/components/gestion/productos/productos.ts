import { Component, ViewChild, inject, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, Subject } from 'rxjs';
import { map, shareReplay, catchError, startWith, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProductoModalComponent, ProductoGuardadoEvent } from '../../../shared/modals/producto-modal/producto-modal';
import { StorageService } from '../../../services/storage.service';
import { ProductosService, Producto } from '../../../services/productos.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../shared/components/notification/notification';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';
import { SIN_CATEGORIA_LABEL } from '../../../constants/categorias';

@Component({
  selector: 'app-productos',
  imports: [CommonModule, FormsModule, ProductoModalComponent, NotificationComponent, SpinnerComponent],
  templateUrl: './productos.html',
  styleUrls: ['./productos.scss'],
})
export class ProductosComponent {
  @ViewChild(ProductoModalComponent) productoModal!: ProductoModalComponent;
  @ViewChild('tableSection') tableSectionRef?: ElementRef<HTMLElement>;
  @ViewChild('scrollContainer') scrollContainerRef?: ElementRef<HTMLElement>;

  private readonly storageService = inject(StorageService);
  private readonly productosService = inject(ProductosService);
  private readonly notificationService = inject(NotificationService);

  readonly searchTerm = signal('');
  /** Filtro por categoría: '' = todas, o nombre de categoría. */
  readonly filterCategoria = signal<string>('');
  /** Filtro rápido: todos | catalogo | apartados | pendientes-resena | pendientes-rembolso | regalados | vendidos | con-devolucion */
  readonly filterType = signal<'todos' | 'catalogo' | 'apartados' | 'pendientes-resena' | 'pendientes-rembolso' | 'regalados' | 'vendidos' | 'con-devolucion'>('catalogo');
  /** true mientras se guarda (agregar/actualizar) para mostrar overlay spinner. */
  readonly saving = signal(false);
  /** Página actual (1-based). */
  readonly currentPage = signal(1);
  readonly pageSize = 8;
  readonly sinCategoriaLabel = SIN_CATEGORIA_LABEL;
  /** IDs de productos con el nombre expandido ("Ver más" pulsado). */
  readonly expandedNombreIds = signal<Set<string>>(new Set());
  private readonly refresh$ = new Subject<void>();

  readonly maxNombreLength = 38;

  readonly productos$ = this.refresh$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.productosService.obtenerProductos().pipe(
        catchError((err) => {
          console.error('Error al cargar productos:', err);
          return of([]);
        })
      )
    ),
    shareReplay(1)
  );

  readonly vista$ = combineLatest([
    this.productos$,
    toObservable(this.searchTerm).pipe(startWith('')),
    toObservable(this.filterType).pipe(startWith('catalogo')),
    toObservable(this.filterCategoria).pipe(startWith('')),
  ]).pipe(
    map(([productos, term, filterType, filterCategoria]) => {
      const t = term.trim().toLowerCase();
      let list = !t
        ? productos
        : productos.filter(
            (p) =>
              p.nombreProducto?.toLowerCase().includes(t) ||
              p.nombreVendedor?.toLowerCase().includes(t) ||
              p.tienda?.toLowerCase().includes(t)
          );
      if (filterCategoria) {
        list = list.filter((p) => (p.categoria ?? '') === filterCategoria);
      }
      switch (filterType) {
        case 'catalogo':
          list = list.filter((p) => !p.apartado && !p.vendido && !p.regalado && (p.precioPagina != null && p.precioPagina !== 0));
          break;
        case 'apartados':
          list = list.filter((p) => p.apartado);
          break;
        case 'pendientes-resena':
          list = list.filter((p) => !p.resenado);
          break;
        case 'pendientes-rembolso':
          list = list.filter(
            (p) =>
              (p.precioCompra ?? 0) > 0 &&
              (p.dineroRembolsado ?? 0) === 0
          );
          break;
        case 'regalados':
          list = list.filter((p) => p.regalado);
          break;
        case 'vendidos':
          list = list.filter((p) => p.vendido);
          break;
        case 'con-devolucion':
          list = list.filter((p) => p.conDevolucion);
          break;
        default:
          break;
      }
      const total = productos.length;
      const regalados = productos.filter((p) => p.regalado).length;
      const pendientesResena = productos.filter((p) => !p.resenado).length;
      const pendientesRembolso = productos.filter(
        (p) =>
          (p.precioCompra ?? 0) > 0 &&
          (p.dineroRembolsado ?? 0) === 0
      ).length;
      const vendidos = productos.filter((p) => p.vendido).length;
      const conDevolucion = productos.filter((p) => p.conDevolucion).length;
      const enCatalogo = productos.filter((p) => !p.apartado && !p.vendido && !p.regalado && (p.precioPagina != null && p.precioPagina !== 0)).length;
      const apartados = productos.filter((p) => p.apartado).length;
      const categoriasUnicas = Array.from(new Set(productos.map((p) => p.categoria ?? '').filter(Boolean))).sort();
      return {
        filtered: list,
        total,
        categoriasUnicas,
        stats: {
          regalados,
          pendientesResena,
          pendientesRembolso,
          vendidos,
          conDevolucion,
          enCatalogo,
          apartados,
        },
      };
    })
  );

  /** Vista con lista paginada (8 por página). */
  readonly vistaPagina$ = combineLatest([
    this.vista$,
    toObservable(this.currentPage).pipe(startWith(1)),
  ]).pipe(
    map(([vista, page]) => {
      const size = this.pageSize;
      const total = vista.filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / size));
      const current = Math.min(Math.max(1, page), totalPages);
      const start = (current - 1) * size;
      const paginated = vista.filtered.slice(start, start + size);
      return {
        ...vista,
        paginated,
        currentPage: current,
        totalPages,
        totalFiltered: total,
      };
    })
  );

  abrirModal() {
    this.productoModal.abrir();
  }

  editarProducto(producto: Producto) {
    this.productoModal.abrirParaEditar(producto);
  }

  async eliminarProducto(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await this.productosService.eliminarProducto(id);
      this.refresh$.next();
      this.notificationService.show('Producto eliminado', 'success', 3000);
    } catch (error) {
      console.error('Error al eliminar:', error);
      this.notificationService.show('Error al eliminar el producto', 'error', 3000);
    }
  }

  filtrarProductos(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  setFilterType(value: 'todos' | 'catalogo' | 'apartados' | 'pendientes-resena' | 'pendientes-rembolso' | 'regalados' | 'vendidos' | 'con-devolucion') {
    this.filterType.set(value);
    this.currentPage.set(1);
  }

  setFilterCategoria(categoria: string) {
    this.filterCategoria.set(categoria);
    this.currentPage.set(1);
  }

  /** Etiqueta de categoría para mostrar en tabla (vacío → Sin categoría). */
  categoriaLabel(categoria: string | undefined | null): string {
    return categoria?.trim() || this.sinCategoriaLabel;
  }

  /** Trunca el nombre del producto a un máximo de caracteres. */
  truncateNombre(nombre: string | undefined | null, max: number): string {
    const n = nombre ?? '';
    return n.length <= max ? n : n.slice(0, max);
  }

  /** Indica si el nombre del producto supera el límite y debe mostrar "Ver más". */
  nombreMuyLargo(nombre: string | undefined | null): boolean {
    return (nombre?.length ?? 0) > this.maxNombreLength;
  }

  /** Indica si el producto tiene el nombre expandido. */
  isNombreExpandido(id: string | undefined): boolean {
    return id != null && this.expandedNombreIds().has(id);
  }

  /** Alterna entre mostrar nombre completo o truncado. */
  toggleNombreExpandido(id: string | undefined): void {
    if (id == null) return;
    const set = new Set(this.expandedNombreIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.expandedNombreIds.set(set);
  }

  setPage(page: number) {
    this.currentPage.set(page);
    // Scroll de la tabla al inicio: el contenedor con scroll es .productos-table-wrapper
    const scrollTableToTop = () => {
      const container = this.scrollContainerRef?.nativeElement;
      const wrapper = container?.querySelector('.productos-table-wrapper') as HTMLElement | null;
      if (wrapper) {
        wrapper.scrollTop = 0;
        wrapper.scrollLeft = 0;
      }
      this.tableSectionRef?.nativeElement?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    };
    setTimeout(scrollTableToTop, 50);
  }

  /** URL de la imagen principal del producto (o null si no hay). */
  imagenPrincipal(producto: Producto): string | null {
    const urls = producto.imagenesUrls ?? [];
    const idx = producto.imagenPrincipalIndex ?? 0;
    return urls[idx] ?? urls[0] ?? null;
  }

  async guardarProducto(data: ProductoGuardadoEvent) {
    this.saving.set(true);
    try {
      const archivos = this.productoModal.getArchivosImagenes();
      let urlsImagenes = data.imagenesUrls ?? [];

      if (archivos.length > 0) {
        const urlsNuevas = await this.storageService.subirImagenes(archivos, data.nombreProducto);
        urlsImagenes = [...urlsImagenes, ...urlsNuevas];
      }

      const payload = { ...data, imagenesUrls: urlsImagenes };

      if (data.id) {
        const { id, ...resto } = payload;
        await this.productosService.actualizarProducto(id!, { ...resto });
        this.notificationService.show('Producto actualizado correctamente', 'success', 3000);
      } else {
        await this.productosService.agregarProducto(payload);
        this.notificationService.show('Producto guardado. Imágenes en Cloudinary.', 'success', 3000);
      }
      this.refresh$.next();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      this.notificationService.show('Error al guardar el producto', 'error', 3000);
    } finally {
      this.saving.set(false);
      this.productoModal.cerrar();
    }
  }
}
