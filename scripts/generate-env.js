/**
 * Genera src/environments/environment.ts para desarrollo local
 * desde variables de entorno o desde el archivo .env (en la raíz del proyecto).
 * Se ejecuta automáticamente antes de "npm start".
 *
 * En Windows puedes crear las variables de entorno con: .\scripts\set-env-windows.ps1
 */

const fs = require('fs');
const path = require('path');

// Cargar .env si existe (dotenv opcional)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {
  // dotenv no instalado o sin .env
}

const env = process.env;

function esc(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const content = `/**
 * Generado por scripts/generate-env.js. No editar ni subir a Git.
 */
export const environment = {
  production: false,
  firebase: {
    apiKey: "${esc(env.FIREBASE_API_KEY) || ''}",
    authDomain: "${esc(env.FIREBASE_AUTH_DOMAIN) || ''}",
    projectId: "${esc(env.FIREBASE_PROJECT_ID) || ''}",
    storageBucket: "${esc(env.FIREBASE_STORAGE_BUCKET) || ''}",
    messagingSenderId: "${esc(env.FIREBASE_MESSAGING_SENDER_ID) || ''}",
    appId: "${esc(env.FIREBASE_APP_ID) || ''}",
    measurementId: "${esc(env.FIREBASE_MEASUREMENT_ID) || ''}"
  },
  cloudinary: {
    cloudName: '${(env.CLOUDINARY_CLOUD_NAME || '').replace(/'/g, "\\'")}',
    apiKey: '${(env.CLOUDINARY_API_KEY || '').replace(/'/g, "\\'")}',
    uploadPreset: '${(env.CLOUDINARY_UPLOAD_PRESET || '').replace(/'/g, "\\'")}',
    apiSecret: undefined as string | undefined,
    deleteEndpoint: undefined as string | undefined
  }
};
`;

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
fs.writeFileSync(outPath, content, 'utf8');
console.log('Generated:', outPath);
