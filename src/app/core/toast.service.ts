import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  tipo: 'ok' | 'error';
  texto: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<Toast[]>([]);
  private siguiente = 1;

  ok(texto: string): void {
    this.mostrar('ok', texto, 4000);
  }

  error(texto: string): void {
    this.mostrar('error', texto, 8000);
  }

  cerrar(id: number): void {
    this.items.update((lista) => lista.filter((t) => t.id !== id));
  }

  private mostrar(tipo: Toast['tipo'], texto: string, duracionMs: number): void {
    const id = this.siguiente++;
    this.items.update((lista) => [...lista, { id, tipo, texto }]);
    setTimeout(() => this.cerrar(id), duracionMs);
  }
}
