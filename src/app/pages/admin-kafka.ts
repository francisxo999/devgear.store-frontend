import { ChangeDetectionStrategy, DestroyRef, Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { describirError } from '../core/errors';
import { Bloqueo, MetricasNavegacion, MetricasPagos } from '../core/models';
import { ToastService } from '../core/toast.service';

/** Panel de administración: lo que Kafka está moviendo, con refresco automático cada 3 segundos. */
@Component({
  selector: 'dg-admin-kafka',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Kafka en vivo</h1>
        <p class="muted">Se actualiza solo cada 3 segundos · tópicos navegacion.eventos y pagos.intentos</p>
      </div>
      <button class="btn btn-quiet" type="button" (click)="cargar()">Actualizar</button>
    </div>

    @if (error()) {
      <div class="notice notice-error" role="alert"><span>{{ error() }}</span></div>
    }

    <h2 class="seccion">Navegación (ms-recomendaciones)</h2>
    @if (nav(); as n) {
      <div class="tiles">
        <div class="tile"><span class="tile-n">{{ n.totalEventos }}</span><span class="muted small">eventos procesados</span></div>
        <div class="tile"><span class="tile-n">{{ n.eventosUltimoMinuto }}</span><span class="muted small">en el último minuto</span></div>
        <div class="tile"><span class="tile-n">{{ n.usuariosActivos }}</span><span class="muted small">usuarios distintos</span></div>
      </div>

      <div class="cols">
        <section class="panel">
          <h3>Eventos por tipo</h3>
          @for (t of tipos(n); track t[0]) {
            <div class="fila"><span>{{ t[0] }}</span><strong>{{ t[1] }}</strong></div>
          } @empty {
            <p class="muted small">Aún no hay eventos.</p>
          }
        </section>
        <section class="panel">
          <h3>Eventos por partición</h3>
          @for (p of tipos2(n); track p[0]) {
            <div class="fila"><span>Partición {{ p[0] }}</span><strong>{{ p[1] }}</strong></div>
          } @empty {
            <p class="muted small">Aún no hay eventos.</p>
          }
        </section>
        <section class="panel">
          <h3>Categorías más activas</h3>
          @for (c of n.topCategorias; track c.nombre) {
            <div class="fila"><span>{{ c.nombre }}</span><strong>{{ c.total }}</strong></div>
          } @empty {
            <p class="muted small">Aún no hay eventos.</p>
          }
        </section>
      </div>
    }

    <h2 class="seccion">Pagos y antifraude (ms-pagos)</h2>
    @if (pagos(); as p) {
      <div class="tiles">
        <div class="tile"><span class="tile-n">{{ p.intentosTotales }}</span><span class="muted small">intentos de pago</span></div>
        <div class="tile"><span class="tile-n">{{ p.intentosUltimoMinuto }}</span><span class="muted small">en el último minuto</span></div>
        <div class="tile tile-alerta"><span class="tile-n">{{ p.clientesBloqueados }}</span><span class="muted small">clientes bloqueados</span></div>
      </div>

      <div class="cols">
        <section class="panel">
          <h3>Pagos por estado</h3>
          @for (e of estados(p); track e[0]) {
            <div class="fila"><span>{{ e[0] }}</span><strong>{{ e[1] }}</strong></div>
          }
        </section>
        <section class="panel panel-ancho">
          <h3>Clientes bloqueados (3 intentos en 10 s → 30 min)</h3>
          @for (b of bloqueos(); track b.idCliente) {
            <div class="fila">
              <span>{{ b.idCliente }} · hasta {{ hora(b.bloqueadoHasta) }}</span>
              <button class="btn btn-quiet btn-sm" type="button" (click)="desbloquear(b)">Desbloquear</button>
            </div>
          } @empty {
            <p class="muted small">Nadie está bloqueado ahora.</p>
          }
        </section>
      </div>
    }
  `,
  styles: [
    `
      .seccion {
        font-size: 1.05rem;
        margin: 26px 0 12px;
      }
      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }
      .tile {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-m);
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        box-shadow: var(--shadow);
      }
      .tile-n {
        font-size: 1.9rem;
        font-weight: 700;
        line-height: 1.1;
      }
      .tile-alerta .tile-n {
        color: var(--coral);
      }
      .cols {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
      }
      .panel-ancho {
        grid-column: 1 / -1;
      }
      .panel h3 {
        margin: 0 0 8px;
        font-size: 0.95rem;
      }
      .fila {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 6px 0;
        border-bottom: 1px solid var(--line-soft);
      }
      .fila:last-child {
        border-bottom: 0;
      }
    `,
  ],
})
export class AdminKafkaPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nav = signal<MetricasNavegacion | null>(null);
  protected readonly pagos = signal<MetricasPagos | null>(null);
  protected readonly bloqueos = signal<Bloqueo[]>([]);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.cargar();
    const timer = setInterval(() => this.cargar(), 3000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected cargar(): void {
    this.api.metricasNavegacion().subscribe({
      next: (m) => {
        this.nav.set(m);
        this.error.set('');
      },
      error: (e: unknown) => this.error.set('Navegación: ' + describirError(e)),
    });
    this.api.metricasPagos().subscribe({
      next: (m) => this.pagos.set(m),
      error: (e: unknown) => this.error.set('Pagos: ' + describirError(e)),
    });
    this.api.bloqueosDePago().subscribe({
      next: (b) => this.bloqueos.set(b),
      error: () => undefined,
    });
  }

  protected desbloquear(b: Bloqueo): void {
    this.api.desbloquearCliente(b.idCliente).subscribe({
      next: () => {
        this.toast.ok(`${b.idCliente} desbloqueado`);
        this.cargar();
      },
      error: (e: unknown) => this.toast.error(describirError(e)),
    });
  }

  protected tipos(n: MetricasNavegacion): [string, number][] {
    return Object.entries(n.eventosPorTipo);
  }

  protected tipos2(n: MetricasNavegacion): [string, number][] {
    return Object.entries(n.eventosPorParticion);
  }

  protected estados(p: MetricasPagos): [string, number][] {
    return Object.entries(p.pagosPorEstado);
  }

  protected hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
}
