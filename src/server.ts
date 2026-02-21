import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getContext } from '@netlify/angular-runtime/context.mjs';

const angularAppEngine = new AngularAppEngine();

export async function netlifyAppEngineHandler(
  request: Request,
): Promise<Response> {
  const context = getContext();

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

  const result = await angularAppEngine.handle(req, context);
  return result ?? new Response('Not found', { status: 404 });
}

/**
 * Request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
