/** Emails de administradores que pueden entrar a Personal (control de déficit). Ajusta con tu(s) email(s). */
export const environment = {
  production: false,
  adminEmails: [] as string[], // Ej: ['tu-email@gmail.com']
  firebase: {
    apiKey: "AIzaSyDB-zH0zA1If_esGsag4awWxenZjYo8Aeo",
    authDomain: "productoschinos-a0198.firebaseapp.com",
    projectId: "productoschinos-a0198",
    storageBucket: "productoschinos-a0198.firebasestorage.app",
    messagingSenderId: "947461041324",
    appId: "1:947461041324:web:1deb29cee30a4491b84309",
    measurementId: "G-P5BFSRHYJJ"
  },
  cloudinary: {
    cloudName: 'dymnqhr1p',
    apiKey: '266679319154826',
    uploadPreset: 'adminEvb',
    apiSecret: undefined as string | undefined,
    deleteEndpoint: undefined as string | undefined
  }
};
