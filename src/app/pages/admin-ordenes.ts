import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { describirError } from '../core/errors';
import { ClpPipe } from '../core/format';
import { Orden } from '../core/models';
import { OrdenCard } from '../shared/orden-card';

@Component({
  selector: 'dg-admin-ordenes',
  imports: [OrdenCard, ClpPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Todas las órdenes</h1>
        <p class="muted">
          {{ ordenes().length }} {{ ordenes().length === 1 ? 'orden' : 'órdenes' }} · vendido {{ vendido() | clp }}
        </p>
      </div>
      <button class="btn btn-quiet" type="button" (click)="cargar()">Actualizar</button>
    </div>

    @if (cargando()) {
      <p class="empty">Cargando órdenes…</p>
    } @else if (error()) {
      <div class="notice notice-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (ordenes().length === 0) {
      <div class="empty">
        <h2>Aún no hay órdenes</h2>
        <p>Aparecerán aquí cuando los clientes confirmen sus compras.</p>
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
export class AdminOrdenesPage implements OnInit {
  private readonly api = inject(ApiService);

  protected readonly ordenes = signal<Orden[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly vendido = computed(() => this.ordenes().reduce((suma, o) => suma + o.total, 0));

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.todasLasOrdenes().subscribe({
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
