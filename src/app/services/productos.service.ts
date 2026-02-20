import { Injectable, inject, NgZone } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import type { QuerySnapshot } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ProductoFormData } from '../shared/modals/producto-modal/producto-modal';

export interface Producto extends ProductoFormData {
  id?: string;
  imagenesUrls?: string[];
  createdAt?: Date | unknown;
  updatedAt?: Date | unknown;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly firestore = inject(Firestore);
  private readonly ngZone = inject(NgZone);
  private readonly collectionName = 'productos';

  private get productosRef() {
    return collection(this.firestore, this.collectionName);
  }

  agregarProducto(
    producto: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'> & { imagenesUrls?: string[] }
  ): Promise<string> {
    const ahora = new Date();
    const docData = {
      ...producto,
      imagenesUrls: producto.imagenesUrls ?? [],
      createdAt: ahora,
      updatedAt: ahora,
    };
    return addDoc(this.productosRef, docData).then((docRef) => docRef.id);
  }

  /** Estadísticas para el layout: total de productos y cantidad vendidos. */
  obtenerEstadisticasProductos(): Observable<{ total: number; vendidos: number }> {
    const obs = new Observable<QuerySnapshot>((subscriber) => {
      getDocs(this.productosRef)
        .then((snapshot) => {
          this.ngZone.run(() => {
            subscriber.next(snapshot);
            subscriber.complete();
          });
        })
        .catch((err) => this.ngZone.run(() => subscriber.error(err)));
    });
    return obs.pipe(
      map((snapshot) => {
        const total = snapshot.docs.length;
        const vendidos = snapshot.docs.filter(
          (d) => (d.data() as { vendido?: boolean }).vendido === true
        ).length;
        return { total, vendidos };
      })
    );
  }

  obtenerProductos(): Observable<Producto[]> {
    const obs = new Observable<QuerySnapshot>((subscriber) => {
      getDocs(this.productosRef)
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
          return this.docToProducto(docSnap.id, data);
        })
      ),
      map((productos) => {
        const toDate = (v: unknown) =>
          v && typeof (v as { toDate?: () => Date }).toDate === 'function'
            ? (v as { toDate: () => Date }).toDate()
            : v
              ? new Date((v as Date).getTime?.() ?? (v as string))
              : new Date(0);
        return productos.sort(
          (a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
        );
      })
    );
  }

  private docToProducto(id: string, data: Record<string, unknown>): Producto {
    return {
      id,
      nombreProducto: (data['nombreProducto'] as string) ?? '',
      enlaceProducto: (data['enlaceProducto'] as string) ?? '',
      imagenesUrls: (data['imagenesUrls'] as string[]) ?? [],
      imagenPrincipalIndex: (data['imagenPrincipalIndex'] as number) ?? 0,
      nombreVendedor: (data['nombreVendedor'] as string) ?? '',
      contacto: (data['contacto'] as string) ?? '',
      tienda: (data['tienda'] as string) ?? '',
      vendidoPor: (data['vendidoPor'] as string) ?? '',
      precioCompra: (data['precioCompra'] as number) ?? null,
      dineroRembolsado: (data['dineroRembolsado'] as number) ?? null,
      precioPagina: (data['precioPagina'] as number) ?? null,
      tarjeta: (data['tarjeta'] as string) ?? 'BBVA',
      resenado: (data['resenado'] as boolean) ?? false,
      apartado: (data['apartado'] as boolean) ?? false,
      vendido: (data['vendido'] as boolean) ?? false,
      regalado: (data['regalado'] as boolean) ?? false,
      conDevolucion: (data['conDevolucion'] as boolean) ?? false,
      porcentajeDevolucion: (data['porcentajeDevolucion'] as number) ?? null,
      createdAt: (data['createdAt'] as { toDate?: () => Date })?.toDate?.() ?? data['createdAt'],
      updatedAt: (data['updatedAt'] as { toDate?: () => Date })?.toDate?.() ?? data['updatedAt'],
    } as Producto;
  }

  actualizarProducto(id: string, producto: Partial<Producto>): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return updateDoc(ref, { ...producto, updatedAt: new Date() });
  }

  eliminarProducto(id: string): Promise<void> {
    const ref = doc(this.firestore, this.collectionName, id);
    return deleteDoc(ref);
  }
}
