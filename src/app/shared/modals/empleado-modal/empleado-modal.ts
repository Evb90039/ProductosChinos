import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var bootstrap: any;

export interface EmpleadoFormData {
  fullName: string;
  phone: string;
  position: string;
  department: string;
  hireDate: string;
}

/** Al guardar, si viene `id` es edición; si no, es alta. */
export type EmpleadoGuardadoEvent = EmpleadoFormData & { id?: string };

@Component({
  selector: 'app-empleado-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './empleado-modal.html',
  styleUrls: ['./empleado-modal.scss']
})
export class EmpleadoModalComponent {
  @ViewChild('empleadoModal') modalElement!: ElementRef;
  @Output() empleadoGuardado = new EventEmitter<EmpleadoGuardadoEvent>();

  private modalInstance: any;
  /** Si tiene valor, estamos editando este empleado. */
  editId: string | null = null;

  empleado: EmpleadoFormData = {
    fullName: '',
    phone: '',
    position: '',
    department: '',
    hireDate: ''
  };

  ngAfterViewInit() {
    this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement);
  }

  abrir() {
    this.editId = null;
    this.resetForm();
    this.modalInstance.show();
  }

  /** Abre el modal con los datos del empleado para editar. */
  abrirParaEditar(empleado: { id?: string; fullName: string; phone: string; position: string; department: string; hireDate: string }) {
    this.editId = empleado.id ?? null;
    this.empleado = {
      fullName: empleado.fullName ?? '',
      phone: empleado.phone ?? '',
      position: empleado.position ?? '',
      department: empleado.department ?? '',
      hireDate: empleado.hireDate ?? ''
    };
    this.modalInstance.show();
  }

  cerrar() {
    this.modalInstance.hide();
  }

  guardar() {
    if (this.isFormValid()) {
      const payload: EmpleadoGuardadoEvent = { ...this.empleado };
      if (this.editId) payload.id = this.editId;
      this.empleadoGuardado.emit(payload);
      this.cerrar();
    }
  }

  private isFormValid(): boolean {
    return !!(
      this.empleado.fullName.trim() &&
      this.empleado.phone.trim() &&
      this.empleado.position.trim() &&
      this.empleado.department.trim() &&
      this.empleado.hireDate
    );
  }

  private resetForm() {
    this.empleado = {
      fullName: '',
      phone: '',
      position: '',
      department: '',
      hireDate: ''
    };
  }
}
