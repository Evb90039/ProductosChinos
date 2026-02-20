import { Injectable, inject } from '@angular/core';
import { CloudinaryService } from './cloudinary.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly basePath = 'productos';

  /**
   * Sube una imagen a Cloudinary en la carpeta base (productos).
   */
  async subirImagen(archivo: File, nombreProducto: string, indice: number): Promise<string> {
    const folder = this.basePath;
    return await this.cloudinaryService.subirImagen(archivo, folder);
  }

  /**
   * Sube varias imágenes y devuelve sus URLs en orden.
   */
  async subirImagenes(archivos: File[], nombreProducto: string): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const url = await this.subirImagen(archivos[i], nombreProducto, i);
      urls.push(url);
    }
    return urls;
  }

  /**
   * Elimina una imagen en Cloudinary a partir de su URL (extrae el public_id y llama a la API).
   */
  async eliminarImagen(url: string): Promise<void> {
    try {
      const publicId = this.cloudinaryService.extraerPublicId(url);
      if (publicId) {
        await this.cloudinaryService.eliminarImagen(publicId);
      }
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
    }
  }

  /**
   * Sube una imagen para un objetivo (ej. antes/después), en la carpeta objetivos/{objetivoId}/{tipo}.
   */
  async subirImagenObjetivo(
    archivo: File,
    objetivoId: string,
    tipo: 'antes' | 'despues',
    indice: number
  ): Promise<string> {
    const folder = `objetivos/${objetivoId}/${tipo}`;
    return await this.cloudinaryService.subirImagen(archivo, folder);
  }

  /**
   * Sube varias imágenes de objetivo y devuelve sus URLs.
   */
  async subirImagenesObjetivo(
    archivos: File[],
    objetivoId: string,
    tipo: 'antes' | 'despues'
  ): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const url = await this.subirImagenObjetivo(archivos[i], objetivoId, tipo, i);
      urls.push(url);
    }
    return urls;
  }
}
