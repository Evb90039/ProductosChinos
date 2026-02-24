import { Injectable, inject, NgZone } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';
import type { QuerySnapshot } from 'firebase/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface RegistroDeficit {
  id: string;
  fecha: string;           // YYYY-MM-DD
  pesoKg: number | null;
  desayunoCal: number | null;
  comidaCal: number | null;
  cenaCal: number | null;
  proteinaG: number | null;
  pasosReales: number | null;
  kcalApp: number | null;
  tdeeCal: number | null;
  notas: string;
  createdAt?: number;
}

const COLLECTION_NAME = 'deficit_registros';
const PERFIL_COLLECTION = 'deficit_perfil';

/** Datos necesarios para calcular TDEE (Mifflin-St Jeor). El nivel de actividad se deduce de los pasos del día. */
export interface PerfilTDEE {
  alturaCm: number;
  edad: number;
  sexo: 'M' | 'F';
}

/** Factor de actividad según pasos al día (si no hay pasos = sedentario 1.2). */
export function factorDesdePasos(pasos: number | null | undefined): 1.2 | 1.375 | 1.55 | 1.725 | 1.9 {
  const p = pasos ?? 0;
  if (p < 5000) return 1.2;       // Sedentario
  if (p < 7500) return 1.375;     // Ligero
  if (p < 10000) return 1.55;     // Moderado
  if (p < 12500) return 1.725;    // Muy activo
  return 1.9;                     // Extra activo
}

/** BMR Mifflin-St Jeor; TDEE = BMR * factor (factor según pasos del día). */
export function calcularTDEE(pesoKg: number, perfil: PerfilTDEE, pasosReales: number | null | undefined): number {
  const { alturaCm, edad, sexo } = perfil;
  const bmr =
    10 * pesoKg + 6.25 * alturaCm - 5 * edad + (sexo === 'M' ? 5 : -161);
  const factor = factorDesdePasos(pasosReales);
  return Math.round(bmr * factor);
}

@Injectable({ providedIn: 'root' })
export class DeficitService {
  private readonly firestore = inject(Firestore);
  private readonly ngZone = inject(NgZone);
  private readonly auth = inject(Auth);

  private get collectionRef() {
    return collection(this.firestore, COLLECTION_NAME);
  }

  /** Convierte valor numérico a number o null (Firestore no debe recibir undefined). */
  private numOrNull(v: number | null | undefined): number | null {
    if (v === undefined) return null;
    if (v === null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  /** Documento para Firestore (sin id, sin undefined para que se persistan todos los campos). */
  private toFirestore(r: Omit<RegistroDeficit, 'id'>): Record<string, unknown> {
    return {
      fecha: r.fecha ?? '',
      pesoKg: this.numOrNull(r.pesoKg),
      desayunoCal: this.numOrNull(r.desayunoCal),
      comidaCal: this.numOrNull(r.comidaCal),
      cenaCal: this.numOrNull(r.cenaCal),
      proteinaG: this.numOrNull(r.proteinaG),
      pasosReales: this.numOrNull(r.pasosReales),
      kcalApp: this.numOrNull(r.kcalApp),
      tdeeCal: this.numOrNull(r.tdeeCal),
      notas: r.notas ?? '',
      createdAt: new Date(),
    };
  }

  private fromDoc(id: string, data: Record<string, unknown>): RegistroDeficit {
    const toNum = (v: unknown): number | null =>
      v === null || v === undefined ? null : Number(v);
    const toStr = (v: unknown): string => (v != null ? String(v) : '');
    const toDateMs = (v: unknown): number | undefined => {
      if (v == null) return undefined;
      const d = (v as { toDate?: () => Date })?.toDate?.();
      return d ? d.getTime() : undefined;
    };
    return {
      id,
      fecha: toStr(data['fecha']),
      pesoKg: toNum(data['pesoKg']),
      desayunoCal: toNum(data['desayunoCal']),
      comidaCal: toNum(data['comidaCal']),
      cenaCal: toNum(data['cenaCal']),
      proteinaG: toNum(data['proteinaG']),
      pasosReales: toNum(data['pasosReales']),
      kcalApp: toNum(data['kcalApp']),
      tdeeCal: toNum(data['tdeeCal']),
      notas: toStr(data['notas']),
      createdAt: toDateMs(data['createdAt']),
    };
  }

  obtenerRegistros(): Observable<RegistroDeficit[]> {
    const q = query(this.collectionRef, orderBy('fecha', 'asc'));
    const obs = new Observable<QuerySnapshot>((subscriber) => {
      getDocs(q)
        .then((snapshot) => {
          this.ngZone.run(() => {
            subscriber.next(snapshot);
            subscriber.complete();
          });
        })
        .catch((err) => this.ngZone.run(() => subscriber.error(err)));
    });
    return obs.pipe(
      map((snapshot) =>
        snapshot.docs.map((docSnap) =>
          this.fromDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
        )
      ),
      catchError((err) => {
        console.error('Error al cargar registros de déficit desde Firebase:', err);
        return of([]);
      })
    );
  }

  agregarRegistro(r: Omit<RegistroDeficit, 'id' | 'createdAt'>): Promise<RegistroDeficit> {
    const payload = this.toFirestore({ ...r, createdAt: undefined });
    return addDoc(this.collectionRef, payload).then((docRef) => {
      const nuevo: RegistroDeficit = {
        ...r,
        id: docRef.id,
        createdAt: Date.now(),
      };
      return nuevo;
    });
  }

  actualizarRegistro(id: string, datos: Partial<Omit<RegistroDeficit, 'id' | 'createdAt'>>): Promise<void> {
    const ref = doc(this.firestore, COLLECTION_NAME, id);
    return updateDoc(ref, datos as Record<string, unknown>);
  }

  eliminarRegistro(id: string): Promise<void> {
    const ref = doc(this.firestore, COLLECTION_NAME, id);
    return deleteDoc(ref);
  }

  /** Referencia al documento del perfil TDEE del usuario actual. */
  private get perfilDocRef() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return null;
    return doc(this.firestore, PERFIL_COLLECTION, uid);
  }

  /** Perfil para cálculo de TDEE (guardado en Firebase, un documento por usuario). */
  async getPerfil(): Promise<PerfilTDEE | null> {
    const ref = this.perfilDocRef;
    if (!ref) return null;
    try {
      const snap = await getDoc(ref);
      const data = snap.data() as Record<string, unknown> | undefined;
      if (!data) return null;
      const alturaCm = Number(data['alturaCm']);
      const edad = Number(data['edad']);
      const sexo = data['sexo'] === 'F' ? 'F' : 'M';
      if (Number.isNaN(alturaCm) || Number.isNaN(edad)) return null;
      return { alturaCm, edad, sexo };
    } catch (err) {
      console.error('Error al cargar perfil TDEE:', err);
      return null;
    }
  }

  /** Guarda el perfil TDEE en Firebase (por usuario). */
  async savePerfil(perfil: PerfilTDEE): Promise<void> {
    const ref = this.perfilDocRef;
    if (!ref) throw new Error('Debes iniciar sesión para guardar el perfil');
    await setDoc(ref, {
      alturaCm: perfil.alturaCm,
      edad: perfil.edad,
      sexo: perfil.sexo,
      updatedAt: new Date(),
    });
  }
}
