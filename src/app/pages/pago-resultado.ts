import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CartStore } from '../core/cart.store';
import { describirError } from '../core/errors';
import { ClpPipe } from '../core/format';
import { PagoResultado } from '../core/models';
import { Keycap } from '../shared/keycap';

type Vista = 'cargando' | 'aprobado' | 'rechazado' | 'cancelado' | 'error';

/**
 * Webpay devuelve al cliente aquí:
 *  - ?token_ws=...   pagó (o la tarjeta fue rechazada): se confirma con ms-pagos
 *  - ?TBK_TOKEN=...  anuló el pago o se agotó el tiempo en el formulario de Webpay
 */
@Component({
  selector: 'dg-pago-resultado',
  imports: [ClpPipe, Keycap, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (vista()) {
      @case ('cargando') {
        <p class="empty">Confirmando tu pago con Webpay…</p>
      }
      @case ('aprobado') {
        <section class="confirmacion" aria-live="polite">
          <dg-keycap texto="OK" tono="mint" tamano="xl" />
          <div>
            <h1>Pago aprobado</h1>
            <p class="lead">
              Pagaste {{ resultado()?.monto | clp }} (código {{ resultado()?.buyOrder }}).
              @if (resultado()?.ordenId) {
                Tu orden <strong>#{{ resultado()?.ordenId }}</strong> ya está en proceso y te enviamos el comprobante por correo.
              }
            </p>
            @if (resultado()?.mensaje) {
              <div class="notice notice-error" role="alert"><span>{{ resultado()?.mensaje }}</span></div>
            }
            <div class="row-actions">
              <a class="btn" routerLink="/ordenes">Ver mis órdenes</a>
              <a class="btn btn-quiet" routerLink="/catalogo">Seguir comprando</a>
            </div>
          </div>
        </section>
      }
      @case ('rechazado') {
        <section class="confirmacion" aria-live="polite">
          <dg-keycap texto="X" tono="plum" tamano="xl" />
          <div>
            <h1>El pago fue rechazado</h1>
            <p class="lead">Tu tarjeta no fue aprobada. No se te cobró nada y tu carrito sigue intacto.</p>
            <div class="row-actions">
              <a class="btn" routerLink="/carrito">Volver al carrito</a>
            </div>
          </div>
        </section>
      }
      @case ('cancelado') {
        <section class="confirmacion" aria-live="polite">
          <dg-keycap texto="--" tono="bone" tamano="xl" />
          <div>
            <h1>Cancelaste el pago</h1>
            <p class="lead">No se realizó ningún cobro. Tu carrito sigue como lo dejaste.</p>
            <div class="row-actions">
              <a class="btn" routerLink="/carrito">Volver al carrito</a>
            </div>
          </div>
        </section>
      }
      @case ('error') {
        <div class="notice notice-error" role="alert">
          <span>{{ error() }}</span>
        </div>
        <div class="row-actions">
          <a class="btn btn-quiet" routerLink="/carrito">Volver al carrito</a>
        </div>
      }
    }
  `,
})
export class PagoResultadoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly vista = signal<Vista>('cargando');
  protected readonly resultado = signal<PagoResultado | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const tokenWs = params.get('token_ws');
    const tbkToken = params.get('TBK_TOKEN');

    if (tokenWs) {
      this.api.confirmarPago(tokenWs).subscribe({
        next: (r) => {
          this.resultado.set(r);
          if (r.estado === 'APROBADO') {
            this.vista.set('aprobado');
            this.cart.clear();
            this.cart.refresh().subscribe({ error: () => undefined });
          } else {
            this.vista.set('rechazado');
          }
        },
        error: (e: unknown) => this.fallar(e),
      });
    } else if (tbkToken) {
      this.api.anularPago(tbkToken).subscribe({
        next: () => this.vista.set('cancelado'),
        error: () => this.vista.set('cancelado'),
      });
    } else {
      this.error.set('No encontramos información del pago en esta dirección.');
      this.vista.set('error');
    }
  }

  private fallar(e: unknown): void {
    this.error.set(describirError(e));
    this.vista.set('error');
  }
}
