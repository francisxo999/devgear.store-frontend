import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ItemCarrito } from './models';

/** Estado del carrito compartido: el contador del encabezado y la pantalla del carrito leen lo mismo. */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly api = inject(ApiService);

  readonly items = signal<ItemCarrito[]>([]);
  readonly count = computed(() => this.items().reduce((n, item) => n + item.cantidad, 0));
  readonly total = computed(() => this.items().reduce((suma, item) => suma + item.subtotal, 0));

  refresh(): Observable<ItemCarrito[]> {
    return this.api.carrito().pipe(tap((items) => this.items.set(items)));
  }

  clear(): void {
    this.items.set([]);
  }
}
