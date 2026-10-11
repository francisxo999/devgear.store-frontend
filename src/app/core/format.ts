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

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Los servicios guardan las fechas en UTC y las envían sin zona horaria
 * ("2026-10-11T00:38:12.123"). Aquí se leen como UTC y se muestran en la hora local del navegador.
 */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) {
      return '';
    }
    const recortado = valor.replace(/(\.\d{3})\d+/, '$1');
    const iso = /(Z|[+-]\d{2}:?\d{2})$/i.test(recortado) ? recortado : `${recortado}Z`;
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime()) ? valor : formatoFecha.format(fecha);
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
