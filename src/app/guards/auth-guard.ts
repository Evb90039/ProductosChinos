import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { filter, map, take, switchMap } from 'rxjs/operators';
import { race, timer } from 'rxjs';

/** Rutas hijas protegidas por layout (path ''). Cualquier otra URL debe mostrar 404, no login. */
function isProtectedUrl(url: string): boolean {
  const path = url.split('?')[0].replace(/\/$/, '') || '/';
  return path === '/' ||
    path.startsWith('/dashboard') ||
    path.startsWith('/gestion') ||
    path.startsWith('/analisis') ||
    path.startsWith('/personal');
}

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si la URL no es una ruta protegida (ej. /catalog en vez de /catalogo), mostrar 404 en lugar de login
  if (!isProtectedUrl(state.url)) {
    router.navigate(['/404'], { replaceUrl: true });
    return false;
  }

  // Esperar a que Firebase haya restaurado la sesión (evita redirigir a login al hacer F5)
  const authReady$ = race(
    authService.authReady$.pipe(filter((ready) => ready), take(1)),
    timer(3500)
  ).pipe(take(1));

  return authReady$.pipe(
    switchMap(() => authService.user$.pipe(take(1))),
    map((user) => {
      if (!user) {
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url },
          replaceUrl: true,
        });
        return false;
      }
      return true;
    })
  );
};
