/**
 * Plantilla para environment.ts (desarrollo local).
 * No editar: environment.ts se genera con scripts/generate-env.js
 * a partir de variables de entorno o del archivo .env (no subir .env a Git).
 *
 * Variables esperadas (mismos nombres que en Netlify):
 * FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID,
 * FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID, FIREBASE_MEASUREMENT_ID
 * CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_UPLOAD_PRESET
 */
export const environment = {
  production: false,
  firebase: {
    apiKey: 'FIREBASE_API_KEY',
    authDomain: 'FIREBASE_AUTH_DOMAIN',
    projectId: 'FIREBASE_PROJECT_ID',
    storageBucket: 'FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
    appId: 'FIREBASE_APP_ID',
    measurementId: 'FIREBASE_MEASUREMENT_ID'
  },
  cloudinary: {
    cloudName: 'CLOUDINARY_CLOUD_NAME',
    apiKey: 'CLOUDINARY_API_KEY',
    uploadPreset: 'CLOUDINARY_UPLOAD_PRESET',
    apiSecret: undefined as string | undefined,
    deleteEndpoint: undefined as string | undefined
  }
};
