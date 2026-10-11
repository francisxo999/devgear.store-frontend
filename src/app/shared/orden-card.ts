import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ClpPipe } from '../core/format';
import { Orden } from '../core/models';
import { EstadoBadge } from './estado-badge';

@Component({
  selector: 'dg-orden',
  imports: [ClpPipe, DatePipe, EstadoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="orden">
      <header class="orden-head">
        <div>
          <h2>Orden #{{ orden().id }}</h2>
          <p class="muted">{{ orden().fecha | date: 'dd/MM/yyyy HH:mm' }}</p>
        </div>
        <dg-estado [estado]="orden().estado" />
        <strong class="price">{{ orden().total | clp }}</strong>
      </header>
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
})
export class OrdenCard {
  readonly orden = input.required<Orden>();
}
