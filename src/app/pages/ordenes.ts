import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { describirError } from '../core/errors';
import { Orden } from '../core/models';
import { OrdenCard } from '../shared/orden-card';

@Component({
  selector: 'dg-ordenes',
  imports: [OrdenCard, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Mis órdenes</h1>
        <p class="muted">Las más recientes primero</p>
      </div>
      <button class="btn btn-quiet" type="button" (click)="cargar()">Actualizar</button>
    </div>

    @if (cargando()) {
      <p class="empty">Cargando tus órdenes…</p>
    } @else if (error()) {
      <div class="notice notice-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (ordenes().length === 0) {
      <div class="empty">
        <h2>Todavía no tienes órdenes</h2>
        <p>Cuando confirmes una compra, la verás aquí.</p>
        <a class="btn" routerLink="/catalogo">Ir al catálogo</a>
      </div>
    } @else {
      <div class="stack">
        @for (o of ordenes(); track o.id) {
          <dg-orden [orden]="o" />
        }
      </div>
    }
  `,
})
export class OrdenesPage implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly ordenes = signal<Orden[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.misOrdenes().subscribe({
      next: (lista) => {
        this.ordenes.set([...lista].sort((a, b) => b.id - a.id));
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(describirError(e));
        this.cargando.set(false);
      },
    });
  }
}
