import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';

/** Evento que llega por WebSocket: es un registro de la tabla DynamoDB TelemetriaDevGear. */
interface EventoTelemetria {
  id: string;
  origen: string; // recomendaciones | pagos
  tipo: string; // PRODUCTO_VISTO, ITEM_AGREGADO, ..., PAGO_INTENTO, PAGO_BLOQUEADO
  clienteId?: string;
  productoId?: number;
  categoria?: string;
  monto?: number;
  timestamp: number;
}

interface Registro extends EventoTelemetria {
  recibidoEn: number;
}

type EstadoConexion = 'desconectado' | 'conectando' | 'conectado';

const CLAVE_URL = 'dg_ws_url';
const MAX_REGISTROS = 1000;
const VENTANA_MS = 120_000;
const BARRA_MS = 10_000;

/**
 * Telemetría en tiempo real: ms-recomendaciones y ms-pagos escriben cada evento en DynamoDB;
 * el DynamoDB Stream dispara una Lambda que lo empuja por API Gateway WebSocket a esta página.
 */
@Component({
  selector: 'dg-admin-telemetria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Telemetría en tiempo real</h1>
        <p class="muted">
          Kafka → ms-recomendaciones / ms-pagos → DynamoDB → Stream → Lambda → API Gateway WebSocket
        </p>
      </div>
      <span class="estado" [class.ok]="estado() === 'conectado'" [class.warn]="estado() === 'conectando'">
        <span class="punto"></span>
        {{ etiquetaEstado() }}
      </span>
    </div>

    <section class="panel conexion">
      <label class="field grow">
        <span>URL del WebSocket</span>
        <input
          class="input"
          type="text"
          autocomplete="off"
          placeholder="wss://xxxxxxxx.execute-api.us-east-1.amazonaws.com/prod"
          [value]="url()"
          (input)="cambiarUrl($event)"
        />
      </label>
      @if (estado() === 'desconectado') {
        <button class="btn" type="button" (click)="conectar()">Conectar</button>
      } @else {
        <button class="btn btn-quiet" type="button" (click)="desconectar()">Desconectar</button>
      }
      <button class="btn btn-quiet" type="button" (click)="limpiar()">Limpiar</button>
    </section>

    @if (error()) {
      <div class="notice notice-error" role="alert"><span>{{ error() }}</span></div>
    }

    <div class="tiles">
      <div class="tile">
        <span class="tile-n">{{ navUltimoMinuto() }}</span>
        <span class="muted small">eventos de navegación · último minuto</span>
      </div>
      <div class="tile">
        <span class="tile-n">{{ usuariosActivos() }}</span>
        <span class="muted small">usuarios activos · últimos 5 min</span>
      </div>
      <div class="tile">
        <span class="tile-n">{{ pagosUltimoMinuto() }}</span>
        <span class="muted small">intentos de pago · último minuto</span>
      </div>
      <div class="tile tile-alerta">
        <span class="tile-n">{{ bloqueos() }}</span>
        <span class="muted small">bloqueos antifraude · desde que conectaste</span>
      </div>
    </div>

    <div class="cols">
      <section class="panel panel-ancho">
        <h3>Actividad de los últimos 2 minutos</h3>
        <div class="barras" role="img" aria-label="Eventos por intervalo de 10 segundos">
          @for (b of barras(); track $index) {
            <div class="barra-col" [title]="b.n + ' evento(s)'">
              <div class="barra" [style.height.%]="b.alto"></div>
            </div>
          }
        </div>
        <div class="eje muted small"><span>hace 2 min</span><span>ahora</span></div>
      </section>

      <section class="panel">
        <h3>Eventos por tipo</h3>
        @for (t of porTipo(); track t[0]) {
          <div class="fila"><span>{{ t[0] }}</span><strong>{{ t[1] }}</strong></div>
        } @empty {
          <p class="muted small">Esperando eventos…</p>
        }
      </section>

      <section class="panel">
        <h3>Productos con más actividad</h3>
        @for (p of topProductos(); track p[0]) {
          <div class="fila"><span>Producto #{{ p[0] }}</span><strong>{{ p[1] }}</strong></div>
        } @empty {
          <p class="muted small">Esperando eventos…</p>
        }
      </section>

      <section class="panel panel-ancho">
        <h3>Últimos eventos</h3>
        @for (e of ultimos(); track e.id) {
          <div class="fila">
            <span class="ev">
              <span class="chip-tipo" [class.pago]="e.origen === 'pagos'" [class.alerta]="e.tipo === 'PAGO_BLOQUEADO'">{{ e.tipo }}</span>
              {{ descripcion(e) }}
            </span>
            <span class="muted small">{{ hora(e.recibidoEn) }}</span>
          </div>
        } @empty {
          <p class="muted small">
            {{ estado() === 'conectado' ? 'Conectado. Navega por la tienda o paga para ver llegar eventos.' : 'Conéctate para ver los eventos.' }}
          </p>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .estado {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 999px;
        background: var(--coral-wash);
        color: var(--coral);
        font-weight: 700;
        font-size: 0.9rem;
      }
      .estado.ok {
        background: var(--mint-wash);
        color: #0f5e40;
      }
      .estado.warn {
        background: var(--amber-wash);
        color: var(--amber-ink);
      }
      .punto {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: currentColor;
      }
      .estado.ok .punto {
        animation: pulso 1.4s ease-in-out infinite;
      }
      @keyframes pulso {
        50% {
          opacity: 0.35;
        }
      }
      .conexion {
        display: flex;
        gap: 10px;
        align-items: flex-end;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .grow {
        flex: 1;
        min-width: 240px;
      }
      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
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
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
      .barras {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        height: 110px;
        padding-top: 6px;
      }
      .barra-col {
        flex: 1;
        height: 100%;
        display: flex;
        align-items: flex-end;
      }
      .barra {
        width: 100%;
        min-height: 3px;
        background: var(--cobalt);
        border-radius: 4px 4px 0 0;
        transition: height 0.3s ease;
      }
      .eje {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
      }
      .ev {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .chip-tipo {
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        background: var(--cobalt-wash);
        color: var(--cobalt-deep);
      }
      .chip-tipo.pago {
        background: var(--amber-wash);
        color: var(--amber-ink);
      }
      .chip-tipo.alerta {
        background: var(--coral-wash);
        color: var(--coral);
      }
    `,
  ],
})
export class AdminTelemetriaPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<EstadoConexion>('desconectado');
  protected readonly url = signal(this.urlInicial());
  protected readonly error = signal('');
  private readonly registros = signal<Registro[]>([]);
  private readonly ahora = signal(Date.now());

  private socket: WebSocket | null = null;
  private cierreManual = false;
  private reintento: ReturnType<typeof setTimeout> | undefined;
  private readonly vistos = new Set<string>();

  protected readonly etiquetaEstado = computed(() => {
    switch (this.estado()) {
      case 'conectado':
        return 'WebSocket conectado';
      case 'conectando':
        return 'Conectando…';
      default:
        return 'WebSocket desconectado';
    }
  });

  private readonly navegacion = computed(() => this.registros().filter((r) => r.origen === 'recomendaciones'));

  protected readonly navUltimoMinuto = computed(
    () => this.navegacion().filter((r) => this.ahora() - r.recibidoEn <= 60_000).length,
  );

  protected readonly usuariosActivos = computed(
    () =>
      new Set(
        this.navegacion()
          .filter((r) => this.ahora() - r.recibidoEn <= 300_000 && r.clienteId)
          .map((r) => r.clienteId),
      ).size,
  );

  protected readonly pagosUltimoMinuto = computed(
    () =>
      this.registros().filter(
        (r) => r.tipo === 'PAGO_INTENTO' && this.ahora() - r.recibidoEn <= 60_000,
      ).length,
  );

  protected readonly bloqueos = computed(() => this.registros().filter((r) => r.tipo === 'PAGO_BLOQUEADO').length);

  protected readonly porTipo = computed<[string, number][]>(() => {
    const cuenta = new Map<string, number>();
    for (const r of this.registros()) {
      cuenta.set(r.tipo, (cuenta.get(r.tipo) ?? 0) + 1);
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  });

  protected readonly topProductos = computed<[number, number][]>(() => {
    const cuenta = new Map<number, number>();
    for (const r of this.registros()) {
      if (r.productoId != null) {
        cuenta.set(r.productoId, (cuenta.get(r.productoId) ?? 0) + 1);
      }
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  });

  protected readonly barras = computed(() => {
    const n = VENTANA_MS / BARRA_MS;
    const ahora = this.ahora();
    const cuentas = new Array<number>(n).fill(0);
    for (const r of this.registros()) {
      const edad = ahora - r.recibidoEn;
      if (edad >= 0 && edad < VENTANA_MS) {
        cuentas[n - 1 - Math.floor(edad / BARRA_MS)]++;
      }
    }
    const max = Math.max(1, ...cuentas);
    return cuentas.map((c) => ({ n: c, alto: c === 0 ? 3 : Math.max(8, (c / max) * 100) }));
  });

  protected readonly ultimos = computed(() => this.registros().slice(-12).reverse());

  ngOnInit(): void {
    const tick = setInterval(() => this.ahora.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => {
      clearInterval(tick);
      this.desconectar();
    });
    if (this.url()) {
      this.conectar();
    }
  }

  protected cambiarUrl(ev: Event): void {
    this.url.set((ev.target as HTMLInputElement).value);
  }

  protected conectar(): void {
    const base = this.url().trim();
    if (!/^wss?:\/\//.test(base)) {
      this.error.set('Escribe la URL completa del WebSocket, empezando con wss://');
      return;
    }
    this.guardarUrl(base);
    this.cerrarSocket();
    this.cierreManual = false;
    this.error.set('');
    this.estado.set('conectando');

    const clientId = (this.auth.correo() || 'admin').replace(/[^a-zA-Z0-9-_]/g, '_');
    const ws = new WebSocket(`${base}${base.includes('?') ? '&' : '?'}clientId=${encodeURIComponent(clientId)}`);
    this.socket = ws;
    ws.onopen = () => this.estado.set('conectado');
    ws.onmessage = (m: MessageEvent) => this.recibir(String(m.data));
    ws.onerror = () => this.error.set('No se pudo conectar al WebSocket. Revisa la URL y que el laboratorio esté encendido.');
    ws.onclose = () => {
      if (this.socket !== ws) {
        return;
      }
      this.socket = null;
      this.estado.set('desconectado');
      if (!this.cierreManual) {
        // API Gateway cierra las conexiones inactivas a los 10 min: se reconecta sola.
        this.reintento = setTimeout(() => this.conectar(), 3000);
      }
    };
  }

  protected desconectar(): void {
    this.cierreManual = true;
    this.cerrarSocket();
    this.estado.set('desconectado');
  }

  protected limpiar(): void {
    this.registros.set([]);
    this.vistos.clear();
  }

  protected descripcion(e: Registro): string {
    const quien = this.corto(e.clienteId);
    const prod = e.productoId != null ? `#${e.productoId}` : '';
    switch (e.tipo) {
      case 'PRODUCTO_VISTO':
        return `${quien} vio el producto ${prod}`;
      case 'ITEM_AGREGADO':
        return `${quien} agregó el producto ${prod} al carrito`;
      case 'ITEM_ELIMINADO':
        return `${quien} quitó el producto ${prod} del carrito`;
      case 'FAVORITO_AGREGADO':
        return `${quien} marcó como favorito el producto ${prod}`;
      case 'PAGO_INTENTO':
        return `${quien} intentó pagar ${this.monto(e.monto)}`;
      case 'PAGO_BLOQUEADO':
        return `${quien} bloqueado por antifraude (3 intentos en 10 s)`;
      default:
        return quien;
    }
  }

  protected hora(ms: number): string {
    return new Date(ms).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private recibir(texto: string): void {
    let lote: unknown;
    try {
      lote = JSON.parse(texto);
    } catch {
      return;
    }
    const eventos = Array.isArray(lote) ? lote : [lote];
    const nuevos: Registro[] = [];
    const recibidoEn = Date.now();
    for (const e of eventos as EventoTelemetria[]) {
      if (!e || typeof e.id !== 'string' || typeof e.tipo !== 'string' || this.vistos.has(e.id)) {
        continue;
      }
      this.vistos.add(e.id);
      nuevos.push({ ...e, origen: e.origen ?? '', recibidoEn });
    }
    if (nuevos.length === 0) {
      return;
    }
    this.registros.update((actual) => [...actual, ...nuevos].slice(-MAX_REGISTROS));
    if (this.vistos.size > MAX_REGISTROS * 2) {
      const vigentes = new Set(this.registros().map((r) => r.id));
      this.vistos.clear();
      vigentes.forEach((id) => this.vistos.add(id));
    }
  }

  private cerrarSocket(): void {
    clearTimeout(this.reintento);
    const ws = this.socket;
    this.socket = null;
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }
  }

  private corto(id: string | undefined): string {
    if (!id) {
      return 'Alguien';
    }
    const base = id.includes('@') ? id.split('@')[0] : id;
    return base.length > 12 ? base.slice(0, 8) + '…' : base;
  }

  private monto(m: number | undefined): string {
    return m == null ? '' : '$' + Math.round(m).toLocaleString('es-CL');
  }

  private urlInicial(): string {
    const deEntorno = (environment as unknown as { wsUrl?: string }).wsUrl;
    if (deEntorno) {
      return deEntorno;
    }
    try {
      return localStorage.getItem(CLAVE_URL) ?? '';
    } catch {
      return '';
    }
  }

  private guardarUrl(valor: string): void {
    try {
      localStorage.setItem(CLAVE_URL, valor);
    } catch {
      /* sin almacenamiento: la URL se pide de nuevo */
    }
  }
}
