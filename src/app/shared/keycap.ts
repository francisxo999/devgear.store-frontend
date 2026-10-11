import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tono } from '../core/format';

/** La tecla es el motivo visual de la tienda: marca, productos sin foto y portada. */
@Component({
  selector: 'dg-keycap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="keycap"
      [class]="'keycap tone-' + tono() + ' keycap-' + tamano()"
    >
      <span class="keycap-face">{{ texto() }}</span>
    </span>
  `,
})
export class Keycap {
  readonly texto = input.required<string>();
  readonly tono = input<Tono>('night');
  readonly tamano = input<'sm' | 'md' | 'lg' | 'xl'>('md');
}
