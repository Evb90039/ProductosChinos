import { Injectable, NgZone } from '@angular/core';
import { Auth as FirebaseAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, race, timer } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSubject.asObservable();
  /** Emite true cuando Firebase ha emitido el estado de auth al menos una vez (útil para F5). */
  private authReadySubject = new BehaviorSubject<boolean>(false);
  public authReady$: Observable<boolean> = this.authReadySubject.asObservable();
  private isInitialized = false;

  constructor(
    private auth: FirebaseAuth,
    private router: Router,
    private ngZone: NgZone
  ) {
    // Firebase puede ejecutar el callback fuera de la zona; entramos a Angular para que el guard y la UI reaccionen
    this.auth.onAuthStateChanged((user) => {
      this.ngZone.run(() => {
        this.userSubject.next(user);
        this.isInitialized = true;
        this.authReadySubject.next(true);
        const url = this.router.url;
        if (user && (url === '/login' || url.startsWith('/login?'))) {
          const returnUrl = this.router.parseUrl(url).queryParams['returnUrl'] as string | undefined;
          this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard');
        }
      });
    });
  }

  /**
   * Espera a que Firebase emita el usuario (restauración de sesión) o 3.5 s.
   * Si en ese tiempo user$ emite un usuario, permitimos la ruta (true).
   * Si no, resolvemos con el estado actual (false = ir a login).
   */
  waitForInitialization(): Promise<boolean> {
    const userArrived$ = this.user$.pipe(
      filter((u): u is User => u !== null),
      take(1),
      map(() => true)
    );
    const timeout$ = timer(3500).pipe(
      map(() => this.currentUser !== null)
    );
    return firstValueFrom(race(userArrived$, timeout$));
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      // El onAuthStateChanged se encargará de actualizar el usuario
      this.router.navigate(['/dashboard']);
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string): Promise<void> {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      // El onAuthStateChanged se encargará de actualizar el usuario
      this.router.navigate(['/dashboard']);
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      // El onAuthStateChanged se encargará de limpiar el usuario
      this.router.navigate(['/login']);
    } catch (error) {
      throw error;
    }
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }
}
