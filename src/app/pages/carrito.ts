import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartStore } from '../core/cart.store';
import { describirError } from '../core/errors';
import { ClpPipe, iniciales, tonoDe } from '../core/format';
import { ItemCarrito, Orden } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Keycap } from '../shared/keycap';

@Component({
  selector: 'dg-carrito',
  imports: [ClpPipe, Keycap, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirmada(); as orden) {
      <section class="confirmacion" aria-live="polite">
        <dg-keycap texto="OK" tono="mint" tamano="xl" />
        <div>
          <h1>Orden #{{ orden.id }} confirmada</h1>
          <p class="lead">
            Total {{ orden.total | clp }}. Enviaremos el comprobante a
            <strong>{{ auth.correo() }}</strong> y tu pedido pasa a despacho.
          </p>
          <div class="row-actions">
            <a class="btn" routerLink="/ordenes">Ver mis órdenes</a>
            <a class="btn btn-quiet" routerLink="/catalogo" (click)="confirmada.set(null)">Seguir comprando</a>
          </div>
        </div>
      </section>
    } @else {
      <div class="page-head">
        <div>
          <h1>Carrito</h1>
          <p class="muted">{{ cart.count() }} {{ cart.count() === 1 ? 'producto' : 'productos' }}</p>
        </div>
      </div>

      @if (cargando()) {
        <p class="empty">Cargando carrito…</p>
      } @else if (error()) {
        <div class="notice notice-error" role="alert">
          <span>{{ error() }}</span>
          <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
        </div>
      } @else if (cart.items().length === 0) {
        <div class="empty">
          <h2>Tu carrito está vacío</h2>
          <p>Agrega productos desde el catálogo para armar tu orden.</p>
          <a class="btn" routerLink="/catalogo">Ir al catálogo</a>
        </div>
      } @else {
        <div class="cart-layout">
          <ul class="cart-list">
            @for (item of cart.items(); track item.id) {
              <li class="cart-item">
                <dg-keycap [texto]="iniciales(item.nombreProducto)" [tono]="tono(item.nombreProducto)" tamano="md" />
                <div class="cart-item-info">
                  <strong>{{ item.nombreProducto }}</strong>
                  <span class="muted">{{ item.precioUnitario | clp }} c/u</span>
                </div>
                <div class="stepper" role="group" [attr.aria-label]="'Cantidad de ' + item.nombreProducto">
                  <button type="button" aria-label="Una unidad menos" [disabled]="item.cantidad <= 1 || trabajando() === item.id" (click)="cambiar(item, -1)">−</button>
                  <output>{{ item.cantidad }}</output>
                  <button type="button" aria-label="Una unidad más" [disabled]="trabajando() === item.id" (click)="cambiar(item, 1)">+</button>
                </div>
                <strong class="price cart-item-total">{{ item.subtotal | clp }}</strong>
                <button class="btn btn-text" type="button" [disabled]="trabajando() === item.id" (click)="quitar(item)">
                  Quitar
                </button>
              </li>
            }
          </ul>

          <aside class="summary" aria-label="Resumen de la orden">
            <h2>Resumen</h2>
            <dl>
              <div><dt>Productos</dt><dd>{{ cart.count() }}</dd></div>
              <div class="summary-total"><dt>Total</dt><dd>{{ cart.total() | clp }}</dd></div>
            </dl>
            <button class="btn btn-block" type="button" [disabled]="comprando()" (click)="confirmar()">
              {{ comprando() ? 'Creando orden…' : 'Confirmar compra' }}
            </button>
            <p class="muted small">El stock se descuenta al confirmar la orden.</p>
          </aside>
        </div>
      }
    }
  `,
})
export class CarritoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly trabajando = signal<number | null>(null);
  protected readonly comprando = signal(false);
  protected readonly confirmada = signal<Orden | null>(null);

  protected readonly iniciales = iniciales;

  ngOnInit(): void {
    this.cargar();
  }

  protected tono(texto: string) {
    return tonoDe(texto);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cart.refresh().subscribe({
      next: () => this.cargando.set(false),
      error: (e: unknown) => {
        this.error.set(describirError(e));
        this.cargando.set(false);
      },
    });
  }

  protected cambiar(item: ItemCarrito, delta: number): void {
    this.trabajando.set(item.id);
    this.api.cambiarCantidad(item, item.cantidad + delta).subscribe({
      next: () => this.recargarTras(),
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.trabajando.set(null);
      },
    });
  }

  protected quitar(item: ItemCarrito): void {
    this.trabajando.set(item.id);
    this.api.quitarDelCarrito(item.id).subscribe({
      next: () => {
        this.toast.ok(`${item.nombreProducto} salió del carrito`);
        this.recargarTras();
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.trabajando.set(null);
      },
    });
  }

  protected confirmar(): void {
    this.comprando.set(true);
    this.api.crearOrden().subscribe({
      next: (orden) => {
        this.confirmada.set(orden);
        this.cart.clear();
        this.comprando.set(false);
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.comprando.set(false);
      },
    });
  }

  private recargarTras(): void {
    this.cart.refresh().subscribe({
      next: () => this.trabajando.set(null),
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.trabajando.set(null);
      },
    });
  }
}
