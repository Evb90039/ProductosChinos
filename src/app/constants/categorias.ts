/** Categorías disponibles para productos (estilo Mercado Libre / Amazon). */
export const CATEGORIAS_PRODUCTO = [
  'Electrónica',
  'Audífonos',
  'Smartwatch',
  'Accesorios para celular',
  'Accesorios para laptop',
  'Bocinas',
  'Drones',
  'Hogar',
  'Juguetes',
  'Ropa y accesorios',
  'Deportes',
  'Belleza y cuidado',
  'Herramientas',
  'Seguridad',
  'Carros',
  'Otros',
] as const;

export type CategoriaProducto = (typeof CATEGORIAS_PRODUCTO)[number];

/** Valor guardado cuando no se asigna categoría. */
export const SIN_CATEGORIA_VALUE = '';

/** Etiqueta para mostrar "Sin categoría" en UI. */
export const SIN_CATEGORIA_LABEL = 'Sin categoría';
