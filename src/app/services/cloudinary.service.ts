import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Servicio para subir y eliminar imágenes en Cloudinary.
 *
 * Configuración en environment.cloudinary:
 * - cloudName, apiKey, uploadPreset (obligatorios para subir)
 * - apiSecret (opcional, solo desarrollo: para eliminar desde el frontend; en producción usar backend)
 * - deleteEndpoint (opcional: URL de tu backend que borre por public_id)
 */

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  uploadPreset: string;
  apiSecret?: string;
  deleteEndpoint?: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private get config(): CloudinaryConfig {
    const c = (environment as { cloudinary?: CloudinaryConfig }).cloudinary;
    return {
      cloudName: c?.cloudName ?? 'dymnqhr1p',
      apiKey: c?.apiKey ?? '266679319154826',
      uploadPreset: c?.uploadPreset ?? 'adminEvb',
      apiSecret: c?.apiSecret,
      deleteEndpoint: c?.deleteEndpoint,
    };
  }

  private get uploadUrl(): string {
    return `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`;
  }

  /**
   * Sube una imagen a Cloudinary (upload preset sin firmar).
   */
  async subirImagen(archivo: File, carpeta: string = 'productos'): Promise<string> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', this.config.uploadPreset);
    formData.append('folder', carpeta);

    const response = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || `Cloudinary upload failed: ${response.status}`);
    }

    const data = JSON.parse(text) as { secure_url: string };
    return data.secure_url;
  }

  /**
   * Sube múltiples imágenes y devuelve sus URLs en orden.
   */
  async subirImagenes(archivos: File[], carpeta: string = 'productos'): Promise<string[]> {
    const urls: string[] = [];
    for (const archivo of archivos) {
      const url = await this.subirImagen(archivo, carpeta);
      urls.push(url);
    }
    return urls;
  }

  /**
   * Extrae el public_id de una URL de Cloudinary.
   */
  extraerPublicId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const uploadIndex = pathParts.indexOf('upload');

      if (uploadIndex === -1 || uploadIndex === pathParts.length - 1) {
        return null;
      }

      const publicIdParts = pathParts.slice(uploadIndex + 2);
      let publicId = publicIdParts.join('/');
      publicId = publicId.replace(/\.[^/.]+$/, '');
      return publicId;
    } catch {
      return null;
    }
  }

  /**
   * Elimina una imagen por public_id.
   * - Si existe deleteEndpoint en environment, llama a tu backend (recomendado en producción).
   * - Si no, intenta borrar con api_key + firma (solo si apiSecret está en environment; no recomendado en producción).
   */
  async eliminarImagen(publicId: string): Promise<void> {
    if (this.config.deleteEndpoint) {
      const res = await fetch(this.config.deleteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: publicId }),
      });
      if (!res.ok) throw new Error(`Error al eliminar imagen: ${res.status}`);
      return;
    }

    if (!this.config.apiSecret) {
      console.warn(
        'CloudinaryService.eliminarImagen: configura cloudinary.deleteEndpoint (backend) o cloudinary.apiSecret (solo desarrollo).'
      );
      return;
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = this.generarSignature(publicId, timestamp);
    const deleteUrl = `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/destroy`;

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('api_key', this.config.apiKey);

    const response = await fetch(deleteUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Error al eliminar de Cloudinary:', await response.text());
    }
  }

  /**
   * Firma para destroy (SHA1). Solo usar con apiSecret en desarrollo.
   */
  private generarSignature(publicId: string, timestamp: number): string {
    const str = `public_id=${publicId}&timestamp=${timestamp}${this.config.apiSecret}`;
    return this.sha1(str);
  }

  private sha1(message: string): string {
    const utf8 = unescape(encodeURIComponent(message));
    const bytes = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
    // SHA-1 no está en crypto.subtle; usamos un impl simple para la firma de Cloudinary
    return this.sha1Sync(bytes);
  }

  private sha1Sync(buffer: Uint8Array): string {
    const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
    let H0 = 0x67452301, H1 = 0xefcdab89, H2 = 0x98badcfe, H3 = 0x10325476, H4 = 0xc3d2e1f0;
    const len = buffer.length;
    const bitLen = len * 8;
    const padLen = ((56 - ((len + 1) % 64) + 64) % 64) + 1;
    const totalLen = len + padLen + 8;
    const padded = new Uint8Array(totalLen);
    padded.set(buffer);
    padded[len] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(totalLen - 4, bitLen >>> 0, false);

    const W = new Int32Array(80);
    for (let offset = 0; offset < totalLen; offset += 64) {
      for (let i = 0; i < 16; i++) {
        W[i] = view.getInt32(offset + i * 4, false);
      }
      for (let i = 16; i < 80; i++) {
        W[i] = ((W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]) << 1) | ((W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]) >>> 31);
      }
      let A = H0, B = H1, C = H2, D = H3, E = H4;
      for (let i = 0; i < 80; i++) {
        let F: number, k: number;
        if (i < 20) {
          F = (B & C) | (~B & D);
          k = K[0];
        } else if (i < 40) {
          F = B ^ C ^ D;
          k = K[1];
        } else if (i < 60) {
          F = (B & C) | (B & D) | (C & D);
          k = K[2];
        } else {
          F = B ^ C ^ D;
          k = K[3];
        }
        const t = (((A << 5) | (A >>> 27)) + F + E + k + W[i]) | 0;
        E = D; D = C; C = (B << 30) | (B >>> 2); B = A; A = t;
      }
      H0 = (H0 + A) | 0; H1 = (H1 + B) | 0; H2 = (H2 + C) | 0; H3 = (H3 + D) | 0; H4 = (H4 + E) | 0;
    }
    const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
    return hex(H0) + hex(H1) + hex(H2) + hex(H3) + hex(H4);
  }
}
