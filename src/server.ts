import { AngularAppEngine, createRequestHandler } from '@angular/ssr';

const angularAppEngine = new AngularAppEngine();

/** Contexto de Netlify en producción; objeto vacío en local (ng serve) cuando el módulo no existe. */
async function getContext(): Promise<unknown> {
  try {
    const mod = await import('@netlify/angular-runtime/context.mjs');
    return mod.getContext();
  } catch {
    return {};
  }
}

export async function netlifyAppEngineHandler(
  request: Request,
): Promise<Response> {
  const context = await getContext();

  // Normaliza la URL si falta hostname (evita "Cannot read properties of undefined (reading 'hostname')" en edge)
  let req = request;
  try {
    const url = new URL(request.url);
    if (!url.hostname) {
      const host =
        request.headers.get('x-forwarded-host') ||
        request.headers.get('host') ||
        'localhost';
      const proto =
        request.headers.get('x-forwarded-proto') ||
        request.headers.get('x-forwarded-protocol') ||
        'https';
      req = new Request(`${proto}://${host}${url.pathname}${url.search}`, request);
    }
  } catch {
    // Si falla el parse, seguir con la request original
  }

  let result: Response | null = null;
  try {
    result = await angularAppEngine.handle(req, context);
  } catch {
    // Si SSR falla (p. ej. ruta desconocida), servir index.html para que el cliente muestre el 404
  }
  if (result) return result;
  // Rewrite a index.html: el navegador mantiene la URL y carga la app; el router muestra tu 404
  return new URL('/index.html', req.url) as unknown as Response;
}

/**
 * Request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
