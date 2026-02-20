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

export interface Vendedor {
  id?: string;
  nombre: string;
  telefono: string;
  estatus?: string;
  createdAt?: Date | unknown;
  updatedAt?: Date | unknown;
}

@Injectable({ providedIn: 'root' })
export class VendedoresService {
  private readonly firestore = inject(Firestore);
  private readonly ngZone = inject(NgZone);
  private readonly collectionName = 'vendedores';

  private get vendedoresRef() {
    return collection(this.firestore, this.collectionName);
  }

  agregarVendedor(
    vendedor: Omit<Vendedor, 'id' | 'createdAt' | 'updatedAt' | 'estatus'>
  ): Promise<string> {
    const ahora = new Date();
    const nuevo = {
      ...vendedor,
      estatus: 'activo',
      createdAt: ahora,
      updatedAt: ahora,
    };
    return addDoc(this.vendedoresRef, nuevo).then((docRef) => docRef.id);
  }

  obtenerVendedoresActivos(): Observable<Vendedor[]> {
    const q = query(this.vendedoresRef, where('estatus', '==', 'activo'));
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
            nombre: (data['nombre'] as string) ?? '',
            telefono: (data['telefono'] as string) ?? '',
            estatus: (data['estatus'] as string) ?? 'activo',
            createdAt:
              (data['createdAt'] as { toDate?: () => Date })?.toDate?.() ?? data['createdAt'],
            updatedAt:
              (data['updatedAt'] as { toDate?: () => Date })?.toDate?.() ?? data['updatedAt'],
          } as Vendedor;
        })
      ),
      map((vendedores) => {
        const toDate = (v: unknown) =>
          v && typeof (v as any).toDate === 'function'
            ? (v as any).toDate()
            : v
              ? new Date((v as Date).getTime?.() ?? (v as string))
              : new Date(0);
        return vendedores.sort(
          (a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
        );
      })
    );
  }

  actualizarVendedor(id: string, vendedor: Partial<Vendedor>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, { ...vendedor, updatedAt: new Date() });
  }

  eliminarVendedor(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return deleteDoc(ref);
  }
}
