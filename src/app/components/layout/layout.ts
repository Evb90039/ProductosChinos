import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { HeaderComponent } from '../../shared/components/header/header';
import { ProductosService } from '../../services/productos.service';

/** Ancho a partir del cual se considera "desktop" (sidebar visible por defecto). Debe coincidir con el breakpoint del sidebar en layout.scss (992px). */
const SIDEBAR_DESKTOP_BREAKPOINT = 992;

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, RouterModule, HeaderComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent implements OnInit {
  /** En móvil empieza cerrado; en desktop se abre en ngOnInit. */
  isSidebarOpen = false;
  currentUserEmail = '';
  isGestionCollapsed = false; // Control del colapso de Gestión
  isAnalisisCollapsed = true; // Control del colapso de Análisis

  /** Productos totales y productos vendidos para el footer del sidebar. */
  readonly statsProductos$ = inject(ProductosService).obtenerEstadisticasProductos();

  /** Ítems del submenú Gestión: al agregar o quitar aquí se actualiza el badge y la lista. */
  readonly gestionMenuItems: { route: string; icon: string; iconColor: string; label: string }[] = [
    { route: '/gestion/empleados', icon: 'fa-users', iconColor: '#FF9800', label: 'Empleados' },
    { route: '/gestion/productos', icon: 'fa-box', iconColor: '#DAA520', label: 'Productos' },
    { route: '/gestion/vendedores', icon: 'fa-store', iconColor: '#9C27B0', label: 'Vendedores' },
  ];

  /** Ítems del submenú Análisis. */
  readonly analisisMenuItems: { route: string; icon: string; iconColor: string; label: string }[] = [
    { route: '/analisis/reportes', icon: 'fa-file-alt', iconColor: '#795548', label: 'Reportes' },
    { route: '/analisis/inversiones', icon: 'fa-chart-line', iconColor: '#2196F3', label: 'Inversiones' },
  ];

  /** Secciones principales con submenú: cada una cuenta como 1 en el badge. Al agregar una sección aquí, el conteo se actualiza solo. */
  private readonly principalSections = [this.gestionMenuItems, this.analisisMenuItems] as const;

  /** Cantidad de secciones en Principal (Gestión = 1, Análisis = 1, etc.). */
  get principalMenuCount(): number {
    return this.principalSections.length;
  }

  constructor(
    public router: Router,
    private authService: AuthService
  ) {
    this.authService.user$.subscribe(user => {
      this.currentUserEmail = user?.email || '';
    });
  }

  /** En desktop abre el sidebar por defecto; en móvil lo deja cerrado. */
  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.innerWidth >= SIDEBAR_DESKTOP_BREAKPOINT) {
      this.isSidebarOpen = true;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleGestionCollapse(): void {
    this.isAnalisisCollapsed = true; // Cerrar el otro
    this.isGestionCollapsed = !this.isGestionCollapsed;
  }

  toggleAnalisisCollapse(): void {
    this.isGestionCollapsed = true; // Cerrar el otro
    this.isAnalisisCollapsed = !this.isAnalisisCollapsed;
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    if (typeof window !== 'undefined' && window.innerWidth < SIDEBAR_DESKTOP_BREAKPOINT) {
      this.isSidebarOpen = false; // En móvil cerrar el sidebar al elegir una opción
    } else if (!this.isSidebarOpen) {
      this.isSidebarOpen = true;
    }
  }
}
