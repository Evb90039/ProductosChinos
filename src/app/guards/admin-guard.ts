import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { filter, map, take, switchMap } from 'rxjs/operators';
import { race, timer } from 'rxjs';
import { environment } from '../../environments/environment';

/** Emails que pueden acceder a rutas solo administradores (ej. Personal). Si está vacío, solo se exige estar logueado. */
const ADMIN_EMAILS: string[] = (environment as { adminEmails?: string[] }).adminEmails ?? [];

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.trim().toLowerCase() === normalized);
}

/** Solo permite acceso si el usuario está logueado y su email está en la lista de administradores. */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

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
      if (!isAdminEmail(user.email ?? undefined)) {
        router.navigate(['/dashboard'], { replaceUrl: true });
        return false;
      }
      return true;
    })
  );
};
