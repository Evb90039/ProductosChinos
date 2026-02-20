import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var bootstrap: any;

export interface VendedorFormData {
  nombre: string;
  telefono: string;
}

export type VendedorGuardadoEvent = VendedorFormData & { id?: string };

@Component({
  selector: 'app-vendedor-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './vendedor-modal.html',
  styleUrls: ['./vendedor-modal.scss'],
})
export class VendedorModalComponent {
  @ViewChild('vendedorModal') modalElement!: ElementRef;
  @Output() vendedorGuardado = new EventEmitter<VendedorGuardadoEvent>();

  private modalInstance: any;
  editId: string | null = null;

  vendedor: VendedorFormData = {
    nombre: '',
    telefono: '',
  };

  ngAfterViewInit() {
    this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement);
  }

  abrir() {
    this.editId = null;
    this.resetForm();
    this.modalInstance.show();
  }

  abrirParaEditar(v: { id?: string; nombre: string; telefono: string }) {
    this.editId = v.id ?? null;
    this.vendedor = {
      nombre: v.nombre ?? '',
      telefono: v.telefono ?? '',
    };
    this.modalInstance.show();
  }

  cerrar() {
    this.modalInstance.hide();
  }

  guardar() {
    if (this.isFormValid()) {
      const payload: VendedorGuardadoEvent = { ...this.vendedor };
      if (this.editId) payload.id = this.editId;
      this.vendedorGuardado.emit(payload);
      this.cerrar();
    }
  }

  private isFormValid(): boolean {
    return !!(this.vendedor.nombre.trim() && this.vendedor.telefono.trim());
  }

  private resetForm() {
    this.vendedor = { nombre: '', telefono: '' };
  }
}
