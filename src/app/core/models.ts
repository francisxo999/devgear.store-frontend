export type Rol = 'ADMIN' | 'CLIENTE' | 'DESPACHADOR';
export type EstadoDespacho = 'PENDIENTE' | 'EN_TRANSITO' | 'ENTREGADO';

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl: string | null;
  activo: boolean;
}

export interface ProductoInput {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ItemCarrito {
  id: number;
  productoId: number;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface ItemOrden {
  productoId: number;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Orden {
  id: number;
  fecha: string;
  estado: string;
  total: number;
  items: ItemOrden[];
}

export interface Despacho {
  id: number;
  ordenId: number;
  usuarioId: string;
  estado: string;
  fecha: string;
}

export interface Perfil {
  oid: string;
  nombre: string;
  correo: string;
  roles: string[];
}

// ms-recomendaciones
export interface Recomendacion {
  productoId: number;
  nombre: string;
  categoria: string;
  precio: number;
  imagenUrl: string | null;
  motivo: string;
}

export interface RecomendacionesRespuesta {
  categoriasFavoritas: string[];
  recomendaciones: Recomendacion[];
}

export interface MetricasNavegacion {
  totalEventos: number;
  eventosPorTipo: Record<string, number>;
  eventosUltimoMinuto: number;
  usuariosActivos: number;
  topCategorias: { nombre: string; total: number }[];
  eventosPorParticion: Record<string, number>;
  ultimoEvento: string | null;
}

// ms-pagos
export interface PagoIniciado {
  url: string;
  token: string;
  monto: number;
  buyOrder: string;
}

export interface PagoResultado {
  estado: string;
  monto: number;
  buyOrder: string;
  ordenId: number | null;
  mensaje: string | null;
}

export interface EstadoAntifraude {
  bloqueado: boolean;
  bloqueadoHasta: string | null;
  intentosEnVentana: number;
}

export interface Bloqueo {
  idCliente: string;
  bloqueadoHasta: string;
  intentosEnVentana: number;
}

export interface MetricasPagos {
  intentosTotales: number;
  intentosUltimoMinuto: number;
  clientesBloqueados: number;
  pagosPorEstado: Record<string, number>;
}
