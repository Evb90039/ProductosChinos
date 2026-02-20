import { Injectable, inject, NgZone } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from '@angular/fire/firestore';
import type { QuerySnapshot } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Empleado {
  id?: string;
  fullName: string;
  phone: string;
  position: string;
  department: string;
  hireDate: string;
  estatus?: string;
  createdAt?: Date | unknown;
  updatedAt?: Date | unknown;
}

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private readonly firestore = inject(Firestore);
  private readonly ngZone = inject(NgZone);
  private readonly collectionName = 'empleados';

  private get empleadosRef() {
    return collection(this.firestore, this.collectionName);
  }

  agregarEmpleado(
    empleado: Omit<Empleado, 'id' | 'createdAt' | 'updatedAt' | 'estatus'>
  ): Promise<string> {
    const ahora = new Date();
    const nuevoEmpleado = {
      ...empleado,
      estatus: 'activo',
      createdAt: ahora,
      updatedAt: ahora,
    };
    return addDoc(this.empleadosRef, nuevoEmpleado).then((docRef) => docRef.id);
  }

  /**
   * Usa getDocs + NgZone para evitar el error "reference from a different Firestore SDK"
   * que da collectionData en este entorno. La API es la misma: Observable<Empleado[]>.
   */
  obtenerEmpleadosActivos(): Observable<Empleado[]> {
    const q = query(this.empleadosRef, where('estatus', '==', 'activo'));
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
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            fullName: (data['fullName'] as string) ?? '',
            phone: (data['phone'] as string) ?? '',
            position: (data['position'] as string) ?? '',
            department: (data['department'] as string) ?? '',
            hireDate: (data['hireDate'] as string) ?? '',
            estatus: (data['estatus'] as string) ?? 'activo',
            createdAt:
              (data['createdAt'] as { toDate?: () => Date })?.toDate?.() ?? data['createdAt'],
            updatedAt:
              (data['updatedAt'] as { toDate?: () => Date })?.toDate?.() ?? data['updatedAt'],
          } as Empleado;
        })
      ),
      map((empleados) => {
        const toDate = (v: unknown) =>
          v && typeof (v as any).toDate === 'function'
            ? (v as any).toDate()
            : v
              ? new Date((v as Date).getTime?.() ?? (v as string))
              : new Date(0);
        return empleados.sort(
          (a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
        );
      })
    );
  }

  actualizarEmpleado(id: string, empleado: Partial<Empleado>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, { ...empleado, updatedAt: new Date() });
  }

  eliminarEmpleado(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return deleteDoc(ref);
  }
}
