import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    title: 'Login - Productos Chinos'
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./components/operaciones/catalogo/catalogo').then(m => m.CatalogoComponent),
    title: 'Catálogo - Productos Chinos'
  },
  {
    path: '',
    loadComponent: () => import('./components/layout/layout').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent),
        title: 'Dashboard - Productos Chinos'
      },
      {
        path: 'gestion',
        loadComponent: () => import('./components/gestion/gestion').then(m => m.GestionComponent),
        title: 'Gestión - Productos Chinos'
      },
      {
        path: 'gestion/productos',
        loadComponent: () => import('./components/gestion/productos/productos').then(m => m.ProductosComponent),
        title: 'Productos - Productos Chinos'
      },
      {
        path: 'gestion/empleados',
        loadComponent: () => import('./components/gestion/empleado/empleado').then(m => m.EmpleadoComponent),
        title: 'Empleados - Productos Chinos'
      },
      {
        path: 'gestion/vendedores',
        loadComponent: () => import('./components/gestion/vendedor/vendedor').then(m => m.VendedorComponent),
        title: 'Vendedores - Productos Chinos'
      },
      {
        path: 'analisis',
        loadComponent: () => import('./components/analisis/analisis').then(m => m.AnalisisComponent),
        title: 'Análisis - Productos Chinos'
      },
      {
        path: 'analisis/reportes',
        loadComponent: () => import('./components/analisis/reportes/reportes').then(m => m.ReportesComponent),
        title: 'Reportes - Productos Chinos'
      },
      {
        path: 'analisis/inversiones',
        loadComponent: () => import('./components/analisis/inversiones/inversiones').then(m => m.InversionesComponent),
        title: 'Inversiones - Productos Chinos'
      },
      { 
        path: '', 
        redirectTo: '/dashboard', 
        pathMatch: 'full' 
      }
    ]
  },
  {
    path: '404',
    loadComponent: () => import('./components/not-found/not-found').then(m => m.NotFoundComponent),
    title: 'Página no encontrada - Productos Chinos'
  },
  {
    path: '**',
    loadComponent: () => import('./components/not-found/not-found').then(m => m.NotFoundComponent),
    title: 'Página no encontrada - Productos Chinos'
  }
];
