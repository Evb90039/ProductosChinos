# Despliegue en Netlify

Pasos para desplegar ProductosChinos en Netlify usando `environment.prod.ts` y variables de entorno.

---

## 1. Conectar el repositorio con Netlify

1. Entra en [netlify.com](https://www.netlify.com) e inicia sesión.
2. **Add new site** → **Import an existing project**.
3. Conecta GitHub/GitLab/Bitbucket y elige el repositorio **ProductosChinos**.
4. Netlify detectará el proyecto. No hagas deploy todavía.

---

## 2. Configurar variables de entorno

En la configuración del sitio:

1. **Site configuration** → **Environment variables** → **Add a variable** (o **Add multiple**).
2. Añade estas variables (los valores los sacas de tu Firebase y Cloudinary):

### Firebase (obligatorias)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `FIREBASE_API_KEY` | API Key de Firebase | `AIzaSy...` |
| `FIREBASE_AUTH_DOMAIN` | Auth Domain | `tu-proyecto.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | Project ID | `tu-proyecto` |
| `FIREBASE_STORAGE_BUCKET` | Storage Bucket | `tu-proyecto.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID | `123456789` |
| `FIREBASE_APP_ID` | App ID | `1:123456789:web:abc...` |

### Cloudinary (obligatorias para subir imágenes)

| Variable | Descripción |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Nombre de la nube en Cloudinary |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary |
| `CLOUDINARY_UPLOAD_PRESET` | Upload preset (ej. unsigned) |

### Cloudinary (opcionales)

| Variable | Descripción |
|----------|-------------|
| `CLOUDINARY_API_SECRET` | Solo si lo usas en el backend |
| `CLOUDINARY_DELETE_ENDPOINT` | URL para borrar imágenes si la usas |

### PayPal (opcionales: para ver pagos en Análisis → Pagos PayPal)

En [developer.paypal.com](https://developer.paypal.com) crea una app REST y activa el permiso **Transaction Search**. Luego añade en Netlify:

| Variable | Descripción |
|----------|-------------|
| `PAYPAL_CLIENT_ID` | Client ID de la app REST de PayPal |
| `PAYPAL_CLIENT_SECRET` | Secret de la app (no lo expongas en el frontend) |
| `PAYPAL_MODE` | `sandbox` (pruebas) o `live` (producción). Por defecto: sandbox |

La función serverless `netlify/functions/paypal-transactions.js` usa estas variables para consultar la API de transacciones. Puede tardar hasta 9 horas en activarse el permiso Transaction Search tras añadirlo en la app.

3. Marca **Save** y, si quieres, **Encrypt** para valores sensibles.

---

## 3. Configuración de build (ya está en el repo)

El proyecto ya incluye:

- **Build command:** `npm run build:netlify`  
  (genera `environment.prod.ts` desde las variables de entorno y luego hace `ng build --configuration=production`).
- **Publish directory:** `dist/ProductosChinos/browser`.

En Netlify, en **Build settings**:

- **Build command:** `npm run build:netlify`
- **Publish directory:** `dist/ProductosChinos/browser`

Si usas el `netlify.toml` del repo, Netlify tomará estos valores automáticamente.

---

## 4. Primer deploy

1. Guarda las variables de entorno.
2. **Deploy site** (o haz un push al repositorio si ya está conectado).
3. Espera a que termine el build. Si algo falla, revisa los logs en **Deploy log**.

---

## 5. Comprobar que usa producción

- La app desplegada usa **solo** la configuración de **producción** (`environment.prod.ts`).
- Los valores de Firebase y Cloudinary en la web son los que definiste en las variables de entorno de Netlify, no los de `environment.ts` de desarrollo.

---

## Desarrollo local (Windows): variables de entorno

Para no tener claves en el código y que local funcione igual que Netlify:

1. **Archivo `.env`** (en la raíz del proyecto, no se sube a Git):
   - Copia `.env.example` a `.env` y rellena los mismos nombres de variables que en Netlify (`FIREBASE_API_KEY`, etc.).
   - Antes de `npm start`, el script `scripts/generate-env.js` lee `.env` y genera `src/environments/environment.ts`.

2. **Variables de entorno en Windows** (opcional, para no depender de `.env`):
   - Crea tu `.env` como arriba.
   - En PowerShell, desde la raíz del proyecto:
     ```powershell
     .\scripts\set-env-windows.ps1
     ```
   - Eso crea las variables de **usuario** en Windows a partir de `.env`. Cierra y vuelve a abrir la terminal (o Cursor) para que se apliquen.
   - A partir de ahí, `npm start` usará esas variables aunque no tengas `.env` en la carpeta.

3. **Quitar `environment.ts` del historial de Git** (si antes tenías claves dentro):
   ```bash
   git rm --cached src/environments/environment.ts
   ```
   Luego haz commit. El archivo queda en `.gitignore` y se genera solo en tu máquina al hacer `npm start`.

---

## Resumen del flujo

1. En Netlify defines las variables de entorno.
2. Al hacer build, el script `scripts/generate-env.prod.js` escribe `src/environments/environment.prod.ts` con esos valores.
3. Angular construye con `--configuration=production`, que usa `environment.prod.ts` (por `fileReplacements` en `angular.json`).
4. Netlify publica la carpeta `dist/ProductosChinos/browser`.

Así nunca subes claves al repositorio y en producción solo se usan las variables de Netlify.
