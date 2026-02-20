export const environment = {
  production: true,
  firebase: {
    apiKey: "API_KEY",
    authDomain: "AUTH_DOMAIN",
    projectId: "PROJECT_ID",
    storageBucket: "STORAGE_BUCKET",
    messagingSenderId: "MESSAGING_SENDER_ID",
    appId: "APP_ID"
  },
  cloudinary: {
    cloudName: 'CloudinaryCloudName',
    apiKey: 'CloudinaryAPIKey',
    uploadPreset: 'UploadPreset',
    apiSecret: undefined as string | undefined,
    deleteEndpoint: undefined as string | undefined
  }
};
