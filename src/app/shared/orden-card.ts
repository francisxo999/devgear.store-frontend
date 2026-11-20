import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ClpPipe, FechaPipe } from '../core/format';
import { Orden } from '../core/models';
import { EstadoBadge } from './estado-badge';

@Component({
  selector: 'dg-orden',
  imports: [ClpPipe, FechaPipe, EstadoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="orden">
      <header class="orden-head">
        <div>
          <h2>Orden #{{ orden().id }}</h2>
          <p class="muted">{{ orden().fecha | fecha }}</p>
        </div>
        <dg-estado [estado]="orden().estado" />
        <strong class="price">{{ orden().total | clp }}</strong>
      </header>

      <ol class="linea" aria-label="Seguimiento de la orden">
        @for (paso of pasos; track paso; let i = $index) {
          <li [class.hecho]="i <= actual()" [class.actual]="i === actual()">
            <span class="punto"></span>
            <span class="txt">{{ paso }}</span>
          </li>
        }
      </ol>

      <ul class="orden-items">
        @for (item of orden().items; track item.productoId) {
          <li>
            <span>{{ item.cantidad }} × {{ item.nombreProducto }}</span>
            <span class="muted">{{ item.subtotal | clp }}</span>
          </li>
        }
      </ul>
    </article>
  `,
  styles: [
    `
      .linea {
        display: flex;
        list-style: none;
        margin: 14px 0 6px;
        padding: 0;
      }
      .linea li {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        font-size: 0.82rem;
        color: var(--slate);
        text-align: center;
      }
      /* Tramo que une el punto con el anterior. */
      .linea li + li::before {
        content: '';
        position: absolute;
        top: 7px;
        right: 50%;
        width: 100%;
        height: 3px;
        background: var(--line);
      }
      .linea li.hecho + li.hecho::before {
        background: var(--cobalt);
      }
      .punto {
        position: relative;
        z-index: 1;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        background: var(--surface);
        border: 3px solid var(--line);
      }
      .linea li.hecho .punto {
        background: var(--cobalt);
        border-color: var(--cobalt);
      }
      .linea li.actual .punto {
        box-shadow: 0 0 0 4px rgba(35, 80, 230, 0.2);
      }
      .linea li.actual .txt {
        color: var(--ink, inherit);
        font-weight: 700;
      }
    `,
  ],
})
export class OrdenCard {
  readonly orden = input.required<Orden>();

  protected readonly pasos = ['Orden recibida', 'En preparación', 'En tránsito', 'Entregada'];

  // El estado viene de ms-despachos (vía RabbitMQ): PENDIENTE -> EN_TRANSITO -> ENTREGADO.
  protected readonly actual = computed(
    () => (({ PENDIENTE: 1, EN_TRANSITO: 2, ENTREGADO: 3 }) as Record<string, number>)[this.orden().estado] ?? 0,
  );
}
