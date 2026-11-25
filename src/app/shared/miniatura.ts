import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Tono } from '../core/format';
import { Keycap } from './keycap';

/** Foto pequeña del producto (listas, carrito, tendencias). Sin foto o con la URL rota, vuelve a la tecla con iniciales. */
@Component({
  selector: 'dg-miniatura',
  imports: [Keycap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (imagenUrl() && !fallo()) {
      <span class="mini">
        <img [src]="imagenUrl()" [alt]="alt()" loading="lazy" (error)="fallo.set(true)" />
      </span>
    } @else {
      <dg-keycap [texto]="texto()" [tono]="tono()" tamano="md" />
    }
  `,
  styles: `
    .mini {
      display: inline-grid;
      flex: none;
      width: 64px;
      height: 64px;
      place-items: center;
      overflow: hidden;
      background: #fff;
      border: 1px solid var(--line-soft);
      border-radius: 12px;
    }
    .mini img {
      width: 100%;
      height: 100%;
      padding: 4px;
      object-fit: contain;
    }
  `,
})
export class Miniatura {
  readonly imagenUrl = input<string | null | undefined>(null);
  readonly texto = input.required<string>();
  readonly tono = input<Tono>('night');
  readonly alt = input<string>('');
  protected readonly fallo = signal(false);
}
