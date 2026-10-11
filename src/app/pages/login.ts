import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { describirError } from '../core/errors';
import { Keycap } from '../shared/keycap';

@Component({
  selector: 'dg-login',
  imports: [Keycap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login">
      <section class="login-copy">
        <div class="brand brand-lg">
          <dg-keycap texto="DG" tono="cobalt" tamano="md" />
          <span class="brand-name">DevGear Store</span>
        </div>

        <h1>Hardware para quienes escriben código</h1>
        <p class="lead">
          Teclados, mouse y accesorios para tu escritorio. Entra con tu cuenta Microsoft para ver
          el catálogo, armar tu carrito y seguir tus pedidos.
        </p>

        <button class="btn btn-ms" type="button" (click)="entrar()" [disabled]="entrando()">
          <span class="ms-logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          {{ entrando() ? 'Abriendo Microsoft…' : 'Iniciar sesión con Microsoft' }}
        </button>

        @if (error()) {
          <p class="notice notice-error" role="alert">{{ error() }}</p>
        }
      </section>

      <section class="login-keys" aria-hidden="true">
        <div class="key-row">
          <dg-keycap texto="Catálogo" tono="night" tamano="xl" />
          <dg-keycap texto="Carrito" tono="bone" tamano="xl" />
        </div>
        <div class="key-row key-row-offset">
          <dg-keycap texto="Orden" tono="cobalt" tamano="xl" />
          <dg-keycap texto="Despacho" tono="amber" tamano="xl" />
        </div>
      </section>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);

  protected readonly entrando = signal(false);
  protected readonly error = signal('');

  protected entrar(): void {
    this.entrando.set(true);
    this.error.set('');
    this.auth.login().catch((e: unknown) => {
      this.entrando.set(false);
      this.error.set(describirError(e));
    });
  }
}
