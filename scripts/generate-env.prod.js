/**
 * Genera src/environments/environment.prod.ts con las variables de entorno.
 * Netlify (y otros) inyectan las env vars en el build; este script las escribe en el archivo.
 * Ejecutar antes de: ng build --configuration=production
 */

const fs = require('fs');
const path = require('path');

const env = process.env;

function esc(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const content = `export const environment = {
  production: true,
  firebase: {
    apiKey: "${esc(env.FIREBASE_API_KEY) || 'API_KEY'}",
    authDomain: "${esc(env.FIREBASE_AUTH_DOMAIN) || 'AUTH_DOMAIN'}",
    projectId: "${esc(env.FIREBASE_PROJECT_ID) || 'PROJECT_ID'}",
    storageBucket: "${esc(env.FIREBASE_STORAGE_BUCKET) || 'STORAGE_BUCKET'}",
    messagingSenderId: "${esc(env.FIREBASE_MESSAGING_SENDER_ID) || 'MESSAGING_SENDER_ID'}",
    appId: "${esc(env.FIREBASE_APP_ID) || 'APP_ID'}"
  },
  cloudinary: {
    cloudName: "${esc(env.CLOUDINARY_CLOUD_NAME) || 'CloudinaryCloudName'}",
    apiKey: "${esc(env.CLOUDINARY_API_KEY) || 'CloudinaryAPIKey'}",
    uploadPreset: "${esc(env.CLOUDINARY_UPLOAD_PRESET) || 'UploadPreset'}",
    apiSecret: ${env.CLOUDINARY_API_SECRET ? `"${esc(env.CLOUDINARY_API_SECRET)}"` : 'undefined'} as string | undefined,
    deleteEndpoint: ${env.CLOUDINARY_DELETE_ENDPOINT ? `"${esc(env.CLOUDINARY_DELETE_ENDPOINT)}"` : 'undefined'} as string | undefined
  }
};
`;

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(outPath, content, 'utf8');
console.log('Generated:', outPath);
