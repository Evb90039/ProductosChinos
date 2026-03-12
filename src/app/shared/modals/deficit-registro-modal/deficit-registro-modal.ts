import { Component, EventEmitter, Output, ViewChild, ElementRef, Input, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilTDEE, calcularTDEE, calcularBMR, kcalDesdePasos, type RegistroDeficit } from '../../../services/deficit.service';

declare var bootstrap: any;

/** Payload que emite el modal al guardar (sin id ni createdAt). Si es edición, el padre recibe id. */
export interface RegistroDeficitGuardadoEvent {
  fecha: string;
  pesoKg: number | null;
  desayunoCal: number | null;
  comidaCal: number | null;
  cenaCal: number | null;
  proteinaG: number | null;
  pasosReales: number | null;
  kcalEjercicio: number | null;
  kcalApp: number | null;
  tdeeCal: number | null;
  notas: string;
}

export type RegistroGuardadoEvent = RegistroDeficitGuardadoEvent & { id?: string };

function toNumOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

@Component({
  selector: 'app-deficit-registro-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './deficit-registro-modal.html',
  styleUrl: './deficit-registro-modal.scss',
})
export class DeficitRegistroModalComponent implements AfterViewInit {
  @ViewChild('deficitModal') modalElement!: ElementRef<HTMLDivElement>;
  @Input() perfil: PerfilTDEE | null = null;
  @Output() registroGuardado = new EventEmitter<RegistroGuardadoEvent>();
  @Output() abrirPerfilClick = new EventEmitter<void>();

  private modalInstance: any;
  saving = false;
  /** Si está definido, estamos editando este registro. */
  editId: string | null = null;

  form = this.getFormEmpty();

  private getFormEmpty() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      fecha: today,
      pesoKg: null as number | null,
      desayunoCal: null as number | null,
      comidaCal: null as number | null,
      cenaCal: null as number | null,
      proteinaG: null as number | null,
      pasosReales: null as number | null,
      kcalEjercicio: null as number | null,
      kcalApp: null as number | null,
      tdeeCal: null as number | null,
      notas: '',
    };
  }

  ngAfterViewInit(): void {
    if (this.modalElement?.nativeElement && typeof bootstrap !== 'undefined') {
      this.modalInstance = new bootstrap.Modal(this.modalElement.nativeElement);
    }
  }

  get bmrCalculado(): number | null {
    const peso = this.form.pesoKg;
    if (this.perfil == null || peso == null || peso <= 0) return null;
    return calcularBMR(peso, this.perfil);
  }

  get tdeeCalculado(): number | null {
    const peso = this.form.pesoKg;
    if (this.perfil == null || peso == null || peso <= 0) return null;
    return calcularTDEE(peso, this.perfil, this.form.pasosReales);
  }

  /** Total gastado = TDEE (BMR + pasos) + ejercicio manual. */
  get totalGastadoCalculado(): number | null {
    const tdee = this.tdeeCalculado;
    if (tdee == null) return null;
    const extra = toNumOrNull(this.form.kcalEjercicio) ?? 0;
    return Math.round(tdee + extra);
  }

  /** Kcal App: calorías de los pasos según peso, estatura y sexo del perfil. */
  get kcalAppCalculado(): number | null {
    return kcalDesdePasos(this.form.pasosReales, this.form.pesoKg, this.perfil);
  }

  abrir(): void {
    this.saving = false;
    this.editId = null;
    this.form = this.getFormEmpty();
    this.modalInstance?.show();
  }

  abrirParaEditar(registro: RegistroDeficit): void {
    this.saving = false;
    this.editId = registro.id;
    this.form = {
      fecha: registro.fecha,
      pesoKg: registro.pesoKg,
      desayunoCal: registro.desayunoCal,
      comidaCal: registro.comidaCal,
      cenaCal: registro.cenaCal,
      proteinaG: registro.proteinaG,
      pasosReales: registro.pasosReales,
      kcalEjercicio: registro.kcalEjercicio,
      kcalApp: registro.kcalApp,
      tdeeCal: registro.tdeeCal,
      notas: registro.notas ?? '',
    };
    this.modalInstance?.show();
  }

  cerrar(): void {
    this.saving = false;
    this.modalInstance?.hide();
  }

  /** Construye payload desde this.form y emite. Si editId, el padre actualiza; si no, agrega. */
  guardar(): void {
    const f = this.form;
    const tdeeCal = this.totalGastadoCalculado ?? this.tdeeCalculado ?? toNumOrNull(f.tdeeCal);
    const kcalApp = this.kcalAppCalculado ?? toNumOrNull(f.kcalApp);
    const payload: RegistroDeficitGuardadoEvent = {
      fecha: String(f.fecha ?? ''),
      pesoKg: toNumOrNull(f.pesoKg),
      desayunoCal: toNumOrNull(f.desayunoCal),
      comidaCal: toNumOrNull(f.comidaCal),
      cenaCal: toNumOrNull(f.cenaCal),
      proteinaG: toNumOrNull(f.proteinaG),
      pasosReales: toNumOrNull(f.pasosReales),
      kcalEjercicio: toNumOrNull(f.kcalEjercicio),
      kcalApp,
      tdeeCal,
      notas: String(f.notas ?? '').trim(),
    };
    this.saving = true;
    const event: RegistroGuardadoEvent = this.editId ? { ...payload, id: this.editId } : payload;
    setTimeout(() => this.registroGuardado.emit(event), 0);
  }
}
