import { Component, EventEmitter, Output, ViewChild, ElementRef, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService, type Empleado } from '../../../services/empleados.service';
import { VendedoresService, type Vendedor } from '../../../services/vendedores.service';
import { SpinnerComponent } from '../../components/spinner/spinner';
import { CATEGORIAS_PRODUCTO, SIN_CATEGORIA_VALUE, SIN_CATEGORIA_LABEL } from '../../../constants/categorias';

declare var bootstrap: any;

export interface ProductoFormData {
  nombreProducto: string;
  enlaceProducto: string;
  imagenesUrls?: string[];
  /** Índice (0-based) de la imagen principal en la lista de imágenes. */
  imagenPrincipalIndex?: number;
  /** Categoría del producto (ej. Electrónica, Hogar). Vacío = Sin categoría. */
  categoria?: string;
  nombreVendedor: string;
  contacto: string;
  tienda: string;
  vendidoPor: string;
  precioCompra: number | null;
  dineroRembolsado: number | null;
  precioPagina: number | null;
  tarjeta: string;
  resenado: boolean;
  apartado: boolean;
  vendido: boolean;
  regalado: boolean;
  conDevolucion: boolean;
  /** Porcentaje de devolución (ej. 80 = 80%). Solo aplica si conDevolucion es true. */
  porcentajeDevolucion: number | null;
}

export type ProductoGuardadoEvent = ProductoFormData & { id?: string };

@Component({
  selector: 'app-producto-modal',
  imports: [CommonModule, FormsModule, SpinnerComponent],
  templateUrl: './producto-modal.html',
  styleUrls: ['./producto-modal.scss'],
})
export class ProductoModalComponent implements OnInit {
  @ViewChild('productoModal') modalElement!: ElementRef;
  @Output() productoGuardado = new EventEmitter<ProductoGuardadoEvent>();

  private readonly empleadosService = inject(EmpleadosService);
  private readonly vendedoresService = inject(VendedoresService);
  private readonly cdr = inject(ChangeDetectorRef);
  private modalInstance: any;
  editId: string | null = null;
  activeTab: 'producto' | 'vendedor' | 'finanzas' = 'producto';

  /** Empleados activos para el select "Vendido por". */
  empleados: Empleado[] = [];
  /** Vendedores de la BD para elegir en la pestaña Vendedor. */
  vendedores: Vendedor[] = [];
  /** ID del vendedor seleccionado en el dropdown (como Tienda). */
  selectedVendedorId: string | null = null;
  /** Vendedor seleccionado (de la BD); si está setado, nombre y teléfono van bloqueados. */
  selectedVendedor: Vendedor | null = null;

  /** true mientras el padre está guardando (subida + Firestore). */
  saving = false;

  readonly tarjetas = ['BBVA', 'MercaCredito', 'Banamex'];
  readonly tiendas: string[] = ['Amazon', 'Mercado Libre'];
  readonly categorias = CATEGORIAS_PRODUCTO;
  readonly sinCategoriaValue = SIN_CATEGORIA_VALUE;
  readonly sinCategoriaLabel = SIN_CATEGORIA_LABEL;

  ngOnInit(): void {
    this.empleadosService.obtenerEmpleadosActivos().subscribe((lista) => {
      this.empleados = lista;
    });
    this.vendedoresService.obtenerVendedoresActivos().subscribe((lista) => {
      this.vendedores = lista;
      if (this.editId && this.form.nombreVendedor?.trim() && this.form.contacto?.trim()) {
        this.preseleccionarVendedorSiExiste();
      }
    });
  }

  /** Al cambiar el vendedor en el dropdown (igual que Tienda): rellena nombre y contacto; teléfono queda bloqueado. */
  onVendedorSelect(id: string | null): void {
    this.selectedVendedorId = id && id.trim() ? id : null;
    if (!this.selectedVendedorId) {
      this.selectedVendedor = null;
      this.form.nombreVendedor = '';
      this.form.contacto = '';
    } else {
      const v = this.vendedores.find((x) => x.id === this.selectedVendedorId);
      if (v) {
        this.selectedVendedor = v;
        this.form.nombreVendedor = v.nombre;
        this.form.contacto = v.telefono;
      }
    }
    this.cdr.markForCheck();
  }

  /** Al editar, intenta preseleccionar vendedor por nombre y teléfono. */
  private preseleccionarVendedorSiExiste(): void {
    if (!this.form.nombreVendedor?.trim() || !this.form.contacto?.trim()) return;
    const match = this.vendedores.find(
      (v) =>
        v.nombre.trim().toLowerCase() === this.form.nombreVendedor.trim().toLowerCase() &&
        v.telefono.trim() === this.form.contacto.trim()
    );
    if (match?.id) {
      this.selectedVendedorId = match.id;
      this.selectedVendedor = match;
    }
  }

  /** Archivos de imagen seleccionados (se suben a Cloudinary al guardar). */
  archivosImagenes: File[] = [];
  /** URLs de previsualización para archivos nuevos (object URLs). */
  archivosPreviewUrls: string[] = [];

  form: ProductoFormData = {
    nombreProducto: '',
    enlaceProducto: '',
    imagenPrincipalIndex: 0,
    categoria: SIN_CATEGORIA_VALUE,
    nombreVendedor: '',
    contacto: '',
    tienda: '',
    vendidoPor: '',
    precioCompra: null,
    dineroRembolsado: null,
    precioPagina: null,
    tarjeta: 'BBVA',
    resenado: false,
    apartado: false,
    vendido: false,
    regalado: false,
    conDevolucion: false,
    porcentajeDevolucion: null,
  };

  ngAfterViewInit() {
    this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement);
  }

  abrir() {
    this.editId = null;
    this.activeTab = 'producto';
    this.saving = false;
    this.selectedVendedorId = null;
    this.selectedVendedor = null;
    this.revocarPreviewUrls();
    this.archivosImagenes = [];
    this.archivosPreviewUrls = [];
    this.resetForm();
    this.modalInstance.show();
  }

  abrirParaEditar(producto: ProductoFormData & { id?: string }) {
    this.editId = producto.id ?? null;
    this.activeTab = 'producto';
    this.saving = false;
    this.selectedVendedorId = null;
    this.selectedVendedor = null;
    this.revocarPreviewUrls();
    this.archivosImagenes = [];
    this.archivosPreviewUrls = [];
    this.form = {
      nombreProducto: producto.nombreProducto ?? '',
      enlaceProducto: producto.enlaceProducto ?? '',
      imagenesUrls: producto.imagenesUrls ?? [],
      imagenPrincipalIndex: producto.imagenPrincipalIndex ?? 0,
      categoria: producto.categoria ?? SIN_CATEGORIA_VALUE,
      nombreVendedor: producto.nombreVendedor ?? '',
      contacto: producto.contacto ?? '',
      tienda: producto.tienda ?? '',
      vendidoPor: producto.vendidoPor ?? '',
      precioCompra: producto.precioCompra ?? null,
      dineroRembolsado: producto.dineroRembolsado ?? null,
      precioPagina: producto.precioPagina ?? null,
      tarjeta: producto.tarjeta ?? 'BBVA',
      resenado: producto.resenado ?? false,
      apartado: producto.apartado ?? false,
      vendido: producto.vendido ?? false,
      regalado: producto.regalado ?? false,
      conDevolucion: producto.conDevolucion ?? false,
      porcentajeDevolucion: producto.porcentajeDevolucion ?? null,
    };
    this.preseleccionarVendedorSiExiste();
    this.modalInstance.show();
  }

  cerrar() {
    this.saving = false;
    this.modalInstance.hide();
  }

  setTab(tab: 'producto' | 'vendedor' | 'finanzas') {
    this.activeTab = tab;
  }

  /** Apartado, Vendido y Regalado son excluyentes: solo uno puede estar marcado. */
  setEstadoExcluyente(estado: 'apartado' | 'vendido' | 'regalado', valor: boolean): void {
    if (estado === 'apartado') this.form.apartado = valor;
    if (estado === 'vendido') this.form.vendido = valor;
    if (estado === 'regalado') this.form.regalado = valor;
    if (valor) {
      if (estado !== 'apartado') this.form.apartado = false;
      if (estado !== 'vendido') this.form.vendido = false;
      if (estado !== 'regalado') this.form.regalado = false;
    }
  }

  guardar() {
    if (!this.isTabProductoValid()) {
      this.activeTab = 'producto';
      return;
    }
    if (!this.isTabVendedorValid()) {
      this.activeTab = 'vendedor';
      return;
    }
    if (!this.isTabFinanzasValid()) {
      this.activeTab = 'finanzas';
      return;
    }
    this.saving = true;
    this.cdr.detectChanges();
    const payload: ProductoGuardadoEvent = { ...this.form };
    if (this.editId) payload.id = this.editId;
    setTimeout(() => this.productoGuardado.emit(payload), 0);
    // El modal se cierra cuando el padre termina de guardar (productos.guardarProducto).
  }

  /** Devuelve los archivos de imagen seleccionados (el padre los sube a Cloudinary). */
  getArchivosImagenes(): File[] {
    return [...this.archivosImagenes];
  }

  /** Lista combinada de URLs para mostrar (existentes + previews de archivos nuevos). */
  get imagenesParaSeleccionar(): string[] {
    const existentes = this.form.imagenesUrls ?? [];
    return [...existentes, ...this.archivosPreviewUrls];
  }

  seleccionarImagenPrincipal(index: number): void {
    this.form.imagenPrincipalIndex = index;
  }

  onImagenesSeleccionadas(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    const nuevos = Array.from(files);
    for (const f of nuevos) {
      this.archivosImagenes.push(f);
      this.archivosPreviewUrls.push(URL.createObjectURL(f));
    }
    input.value = '';
  }

  quitarImagen(index: number): void {
    const combinedIndex = (this.form.imagenesUrls?.length ?? 0) + index;
    if (this.archivosPreviewUrls[index]) {
      URL.revokeObjectURL(this.archivosPreviewUrls[index]);
    }
    this.archivosImagenes.splice(index, 1);
    this.archivosPreviewUrls.splice(index, 1);
    this.ajustarPrincipalTrasEliminar(combinedIndex);
  }

  /** Elimina la imagen en el índice combinado (existentes + nuevos). */
  quitarImagenPorIndice(combinedIndex: number, event: Event): void {
    event.stopPropagation();
    const nExistentes = this.form.imagenesUrls?.length ?? 0;
    if (combinedIndex < nExistentes) {
      const urls = [...(this.form.imagenesUrls ?? [])];
      urls.splice(combinedIndex, 1);
      this.form.imagenesUrls = urls.length ? urls : undefined;
      this.ajustarPrincipalTrasEliminar(combinedIndex);
    } else {
      this.quitarImagen(combinedIndex - nExistentes);
    }
  }

  private ajustarPrincipalTrasEliminar(eliminadoIndex: number): void {
    const principal = this.form.imagenPrincipalIndex ?? 0;
    if (principal === eliminadoIndex) {
      this.form.imagenPrincipalIndex = 0;
    } else if (principal > eliminadoIndex) {
      this.form.imagenPrincipalIndex = principal - 1;
    }
  }

  private revocarPreviewUrls(): void {
    for (const url of this.archivosPreviewUrls) {
      URL.revokeObjectURL(url);
    }
  }

  private isTabProductoValid(): boolean {
    return !!(this.form.nombreProducto?.trim() && this.form.enlaceProducto?.trim());
  }

  private isTabVendedorValid(): boolean {
    return !!(
      this.form.nombreVendedor?.trim() &&
      this.form.contacto?.trim() &&
      this.form.tienda?.trim()
    );
  }

  private isTabFinanzasValid(): boolean {
    return (
      this.form.precioCompra != null &&
      this.form.dineroRembolsado != null &&
      this.form.precioPagina != null &&
      this.form.tarjeta?.trim() !== ''
    );
  }

  private resetForm() {
    this.selectedVendedorId = null;
    this.selectedVendedor = null;
    this.form = {
      nombreProducto: '',
      enlaceProducto: '',
      imagenesUrls: undefined,
      imagenPrincipalIndex: 0,
      categoria: SIN_CATEGORIA_VALUE,
      nombreVendedor: '',
      contacto: '',
      tienda: '',
      vendidoPor: '',
      precioCompra: null,
      dineroRembolsado: null,
      precioPagina: null,
      tarjeta: 'BBVA',
      resenado: false,
      apartado: false,
      vendido: false,
      regalado: false,
      conDevolucion: false,
      porcentajeDevolucion: null,
    };
  }
}
