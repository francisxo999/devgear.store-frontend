import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { etiquetaEstado } from '../core/format';

@Component({
  selector: 'dg-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge badge-' + clase()">{{ etiqueta() }}</span>`,
})
export class EstadoBadge {
  readonly estado = input.required<string>();

  protected readonly etiqueta = computed(() => etiquetaEstado(this.estado()));
  protected readonly clase = computed(() => this.estado().toLowerCase().replace(/_/g, '-'));
}
