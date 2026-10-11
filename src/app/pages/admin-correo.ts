import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { describirError } from '../core/errors';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'dg-admin-correo',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Enviar correo</h1>
        <p class="muted">Envío directo con el servicio de notificaciones, sin pasar por una orden</p>
      </div>
    </div>

    <section class="panel narrow">
      <form class="form-grid single" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <label class="field">
          <span>Para</span>
          <input class="input" type="email" formControlName="to" autocomplete="off" />
          @if (invalido('to')) {
            <small class="field-error">Escribe un correo válido.</small>
          }
        </label>

        <label class="field">
          <span>Asunto</span>
          <input class="input" formControlName="subject" autocomplete="off" />
          @if (invalido('subject')) {
            <small class="field-error">El asunto es obligatorio.</small>
          }
        </label>

        <label class="field">
          <span>Mensaje</span>
          <textarea class="input" rows="5" formControlName="body"></textarea>
          @if (invalido('body')) {
            <small class="field-error">El mensaje es obligatorio.</small>
          }
        </label>

        <div class="row-actions">
          <button class="btn" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Enviando…' : 'Enviar correo' }}
          </button>
        </div>
      </form>
    </section>
  `,
})
export class AdminCorreoPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly enviando = signal(false);

  protected readonly form = this.fb.group({
    to: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required]],
    body: ['', [Validators.required]],
  });

  protected invalido(campo: 'to' | 'subject' | 'body'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { to, subject, body } = this.form.getRawValue();
    this.enviando.set(true);
    this.api.enviarCorreo(to, subject, body).subscribe({
      next: (respuesta) => {
        this.toast.ok(respuesta);
        this.form.reset();
        this.enviando.set(false);
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.enviando.set(false);
      },
    });
  }
}
