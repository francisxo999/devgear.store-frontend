import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />

    <div class="toasts" role="status" aria-live="polite">
      @for (t of toasts.items(); track t.id) {
        <div class="toast" [class.toast-error]="t.tipo === 'error'">
          <span>{{ t.texto }}</span>
          <button type="button" class="toast-close" aria-label="Cerrar aviso" (click)="toasts.cerrar(t.id)">×</button>
        </div>
      }
    </div>
  `,
})
export class App {
  protected readonly toasts = inject(ToastService);
}
