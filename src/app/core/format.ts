import { Pipe, PipeTransform } from '@angular/core';

const formatoClp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** Precio en pesos chilenos: 45990 → $45.990 */
@Pipe({ name: 'clp' })
export class ClpPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '' : formatoClp.format(valor);
  }
}

export const TONOS = ['night', 'cobalt', 'bone', 'mint', 'plum', 'amber'] as const;
export type Tono = (typeof TONOS)[number];

/** Mismo texto, mismo color de tecla: así cada categoría conserva su identidad visual. */
export function tonoDe(texto: string): Tono {
  let hash = 0;
  for (const ch of texto) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return TONOS[hash % TONOS.length];
}

/** "Teclado Mecanico RGB" → "TM" */
export function iniciales(texto: string): string {
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  const letras = palabras.slice(0, 2).map((p) => p[0]);
  return letras.join('').toUpperCase() || '?';
}

export function etiquetaEstado(estado: string): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'EN_TRANSITO':
      return 'En tránsito';
    case 'ENTREGADO':
      return 'Entregado';
    default:
      return estado.charAt(0) + estado.slice(1).toLowerCase().replace(/_/g, ' ');
  }
}
