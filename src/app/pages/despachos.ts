import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { describirError } from '../core/errors';
import { FechaPipe, etiquetaEstado } from '../core/format';
import { Despacho, EstadoDespacho } from '../core/models';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'dg-despachos',
  imports: [FechaPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Despachos</h1>
        <p class="muted">Se crean solos cuando un cliente confirma una orden</p>
      </div>
      <button class="btn btn-quiet" type="button" (click)="cargar()">Actualizar</button>
    </div>

    <div class="chips" role="group" aria-label="Filtrar por estado">
      <button type="button" class="chip" [class.on]="filtro() === null" (click)="filtro.set(null)">
        Todos ({{ despachos().length }})
      </button>
      @for (e of estados; track e) {
        <button type="button" class="chip" [class.on]="filtro() === e" (click)="filtro.set(e)">
          {{ etiqueta(e) }} ({{ contar(e) }})
        </button>
      }
    </div>

    @if (cargando()) {
      <p class="empty">Cargando despachos…</p>
    } @else if (error()) {
      <div class="notice notice-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (visibles().length === 0) {
      <div class="empty">
        <h2>No hay despachos en esta vista</h2>
        <p>Cuando un cliente confirme una orden aparecerá aquí como pendiente.</p>
      </div>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Despacho</th>
              <th scope="col">Orden</th>
              <th scope="col">Cliente</th>
              <th scope="col">Creado</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (d of visibles(); track d.id) {
              <tr>
                <td>#{{ d.id }}</td>
                <td>#{{ d.ordenId }}</td>
                <td class="muted" [attr.title]="d.usuarioId">{{ corto(d.usuarioId) }}</td>
                <td>{{ d.fecha | fecha }}</td>
                <td>
                  <div class="segmented" role="group" [attr.aria-label]="'Estado del despacho ' + d.id">
                    @for (e of estados; track e) {
                      <button
                        type="button"
                        [class.on]="d.estado === e"
                        [attr.aria-pressed]="d.estado === e"
                        [disabled]="cambiando() === d.id"
                        (click)="cambiar(d, e)"
                      >
                        {{ etiqueta(e) }}
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class DespachosPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  protected readonly estados: EstadoDespacho[] = ['PENDIENTE', 'EN_TRANSITO', 'ENTREGADO'];
  protected readonly etiqueta = etiquetaEstado;

  protected readonly despachos = signal<Despacho[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly filtro = signal<EstadoDespacho | null>(null);
  protected readonly cambiando = signal<number | null>(null);

  protected readonly visibles = computed(() => {
    const filtro = this.filtro();
    const lista = filtro ? this.despachos().filter((d) => d.estado === filtro) : this.despachos();
    return [...lista].sort((a, b) => b.id - a.id);
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected contar(estado: EstadoDespacho): number {
    return this.despachos().filter((d) => d.estado === estado).length;
  }

  protected corto(usuarioId: string): string {
    return usuarioId.length > 8 ? `${usuarioId.slice(0, 8)}…` : usuarioId;
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.despachos().subscribe({
      next: (lista) => {
        this.despachos.set(lista);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(describirError(e));
        this.cargando.set(false);
      },
    });
  }

  protected cambiar(despacho: Despacho, estado: EstadoDespacho): void {
    if (despacho.estado === estado) {
      return;
    }
    this.cambiando.set(despacho.id);
    this.api.cambiarEstadoDespacho(despacho.id, estado).subscribe({
      next: (actualizado) => {
        this.despachos.update((lista) => lista.map((d) => (d.id === actualizado.id ? actualizado : d)));
        this.toast.ok(`Despacho #${actualizado.id}: ${etiquetaEstado(actualizado.estado)}`);
        this.cambiando.set(null);
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.cambiando.set(null);
      },
    });
  }
}
