import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { CartStore } from '../core/cart.store';
import { describirError } from '../core/errors';
import { ClpPipe, iniciales, tonoDe } from '../core/format';
import { Producto } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Keycap } from '../shared/keycap';

@Component({
  selector: 'dg-catalogo',
  imports: [ClpPipe, Keycap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Catálogo</h1>
        <p class="muted">{{ visibles().length }} de {{ productos().length }} productos</p>
      </div>
      <div class="head-actions">
        <input
          class="input search"
          type="search"
          placeholder="Buscar producto"
          aria-label="Buscar producto"
          [value]="busqueda()"
          (input)="onBusqueda($event)"
        />
        <button class="btn btn-quiet" type="button" (click)="cargar()">Actualizar</button>
      </div>
    </div>

    @if (categorias().length > 1) {
      <div class="chips" role="group" aria-label="Filtrar por categoría">
        <button type="button" class="chip" [class.on]="categoria() === null" (click)="categoria.set(null)">
          Todas
        </button>
        @for (c of categorias(); track c) {
          <button type="button" class="chip" [class.on]="categoria() === c" (click)="categoria.set(c)">
            {{ c }}
          </button>
        }
      </div>
    }

    @if (cargando()) {
      <p class="empty">Cargando catálogo…</p>
    } @else if (error()) {
      <div class="notice notice-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (productos().length === 0) {
      <div class="empty">
        <h2>Aún no hay productos</h2>
        <p>Un administrador puede publicar el primero desde Administración → Productos.</p>
      </div>
    } @else if (visibles().length === 0) {
      <div class="empty">
        <h2>Nada coincide con tu búsqueda</h2>
        <p>Prueba con otra palabra o quita el filtro de categoría.</p>
      </div>
    } @else {
      <div class="grid">
        @for (p of visibles(); track p.id) {
          <article class="product" [class.agotado]="p.stock === 0">
            <div class="product-art">
              @if (p.imagenUrl && !fallidas().has(p.id)) {
                <img [src]="p.imagenUrl" [alt]="p.nombre" loading="lazy" (error)="marcarFallida(p.id)" />
              } @else {
                <dg-keycap [texto]="iniciales(p.nombre)" [tono]="tono(p.categoria)" tamano="lg" />
              }
            </div>

            <div class="product-body">
              <span class="tag">{{ p.categoria }}</span>
              <h2 class="product-name">{{ p.nombre }}</h2>
              @if (p.descripcion) {
                <p class="product-desc">{{ p.descripcion }}</p>
              }
              <div class="product-meta">
                <strong class="price">{{ p.precio | clp }}</strong>
                @if (p.stock === 0) {
                  <span class="stock stock-out">Agotado</span>
                } @else if (p.stock <= 5) {
                  <span class="stock stock-low">Quedan {{ p.stock }}</span>
                } @else {
                  <span class="stock">{{ p.stock }} en stock</span>
                }
              </div>
            </div>

            <div class="product-actions">
              <div class="stepper" role="group" [attr.aria-label]="'Cantidad de ' + p.nombre">
                <button type="button" aria-label="Una unidad menos" [disabled]="p.stock === 0 || cantidad(p) <= 1" (click)="cambiar(p, -1)">−</button>
                <output>{{ cantidad(p) }}</output>
                <button type="button" aria-label="Una unidad más" [disabled]="p.stock === 0 || cantidad(p) >= p.stock" (click)="cambiar(p, 1)">+</button>
              </div>
              <button
                class="btn"
                type="button"
                [attr.aria-label]="'Agregar ' + p.nombre + ' al carrito'"
                [disabled]="p.stock === 0 || agregando() === p.id"
                (click)="agregar(p)"
              >
                {{ agregando() === p.id ? 'Agregando…' : 'Agregar' }}
              </button>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class CatalogoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartStore);
  private readonly toast = inject(ToastService);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly busqueda = signal('');
  protected readonly categoria = signal<string | null>(null);
  protected readonly agregando = signal<number | null>(null);
  protected readonly cantidades = signal<Record<number, number>>({});
  protected readonly fallidas = signal<Set<number>>(new Set());

  protected readonly iniciales = iniciales;

  protected readonly categorias = computed(() =>
    [...new Set(this.productos().map((p) => p.categoria))].sort(),
  );

  protected readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const categoria = this.categoria();
    return this.productos().filter((p) => {
      if (categoria && p.categoria !== categoria) {
        return false;
      }
      if (!texto) {
        return true;
      }
      return `${p.nombre} ${p.descripcion ?? ''} ${p.categoria}`.toLowerCase().includes(texto);
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.productos().subscribe({
      next: (lista) => {
        this.productos.set(lista);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(describirError(e));
        this.cargando.set(false);
      },
    });
  }

  protected tono(categoria: string) {
    return tonoDe(categoria);
  }

  protected onBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected marcarFallida(id: number): void {
    this.fallidas.update((s) => new Set(s).add(id));
  }

  protected cantidad(p: Producto): number {
    return this.cantidades()[p.id] ?? 1;
  }

  protected cambiar(p: Producto, delta: number): void {
    const nueva = Math.min(Math.max(this.cantidad(p) + delta, 1), Math.max(p.stock, 1));
    this.cantidades.update((c) => ({ ...c, [p.id]: nueva }));
  }

  protected agregar(p: Producto): void {
    const cantidad = this.cantidad(p);
    this.agregando.set(p.id);
    this.api.agregarAlCarrito(p.id, cantidad).subscribe({
      next: () => {
        this.toast.ok(`${cantidad} × ${p.nombre} en tu carrito`);
        this.cantidades.update((c) => ({ ...c, [p.id]: 1 }));
        this.agregando.set(null);
        this.cart.refresh().subscribe({ error: () => undefined });
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.agregando.set(null);
      },
    });
  }
}
