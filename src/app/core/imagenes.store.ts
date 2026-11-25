import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

/** Fotos del catálogo por id de producto: el carrito solo guarda el nombre, así que la foto se busca aquí. */
@Injectable({ providedIn: 'root' })
export class ImagenesStore {
  private readonly api = inject(ApiService);
  private cargado = false;

  readonly porProducto = signal<Record<number, string>>({});

  cargar(): void {
    if (this.cargado) {
      return;
    }
    this.cargado = true;
    this.api.productos().subscribe({
      next: (lista) => {
        const mapa: Record<number, string> = {};
        for (const p of lista) {
          if (p.imagenUrl) {
            mapa[p.id] = p.imagenUrl;
          }
        }
        this.porProducto.set(mapa);
      },
      error: () => {
        this.cargado = false;
      },
    });
  }
}
