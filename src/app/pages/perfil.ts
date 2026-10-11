import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { describirError } from '../core/errors';
import { Perfil } from '../core/models';

@Component({
  selector: 'dg-perfil',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Mi perfil</h1>
        <p class="muted">Datos que el servicio de usuarios lee de tu sesión de Microsoft</p>
      </div>
    </div>

    @if (error()) {
      <div class="notice notice-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (perfil(); as p) {
      <section class="panel">
        <dl class="datos">
          <div><dt>Nombre</dt><dd>{{ p.nombre }}</dd></div>
          <div><dt>Correo</dt><dd>{{ p.correo }}</dd></div>
          <div>
            <dt>Roles</dt>
            <dd>
              @for (rol of p.roles; track rol) {
                <span class="badge badge-rol">{{ rol }}</span>
              } @empty {
                <span class="muted">Sin roles asignados</span>
              }
            </dd>
          </div>
          <div><dt>Identificador</dt><dd class="wrap">{{ p.oid }}</dd></div>
          @if (auth.sesionVence(); as vence) {
            <div><dt>Sesión vigente hasta</dt><dd>{{ vence | date: 'dd/MM/yyyy HH:mm' }}</dd></div>
          }
        </dl>
      </section>
    } @else {
      <p class="empty">Cargando perfil…</p>
    }
  `,
})
export class PerfilPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);

  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.error.set('');
    this.api.perfil().subscribe({
      next: (p) => this.perfil.set(p),
      error: (e: unknown) => this.error.set(describirError(e)),
    });
  }
}
