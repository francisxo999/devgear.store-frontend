import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { describirError } from '../core/errors';
import { ClpPipe } from '../core/format';
import { Producto, ProductoInput } from '../core/models';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'dg-admin-productos',
  imports: [ReactiveFormsModule, ClpPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Productos</h1>
        <p class="muted">Crea, edita y ajusta el stock del catálogo</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-quiet" type="button" (click)="cargar()">Actualizar</button>
        <button class="btn" type="button" (click)="nuevo()">Nuevo producto</button>
      </div>
    </div>

    @if (formAbierto()) {
      <section class="panel" aria-labelledby="titulo-form">
        <h2 id="titulo-form">{{ editando() ? 'Editar ' + editando()!.nombre : 'Nuevo producto' }}</h2>
        <form class="form-grid" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
          <label class="field">
            <span>Nombre</span>
            <input class="input" formControlName="nombre" autocomplete="off" />
            @if (invalido('nombre')) {
              <small class="field-error">Escribe un nombre de 3 a 100 caracteres.</small>
            }
          </label>

          <label class="field">
            <span>Categoría</span>
            <input class="input" formControlName="categoria" autocomplete="off" />
            @if (invalido('categoria')) {
              <small class="field-error">La categoría es obligatoria.</small>
            }
          </label>

          <label class="field">
            <span>Precio (CLP)</span>
            <input class="input" type="number" min="1" step="1" formControlName="precio" />
            @if (invalido('precio')) {
              <small class="field-error">El precio debe ser mayor a 0.</small>
            }
          </label>

          <label class="field">
            <span>Stock</span>
            <input class="input" type="number" min="0" step="1" formControlName="stock" />
            @if (invalido('stock')) {
              <small class="field-error">El stock no puede ser negativo.</small>
            }
          </label>

          <label class="field field-wide">
            <span>Descripción</span>
            <textarea class="input" rows="2" formControlName="descripcion"></textarea>
            @if (invalido('descripcion')) {
              <small class="field-error">Máximo 500 caracteres.</small>
            }
          </label>

          <label class="field field-wide">
            <span>URL de imagen (opcional)</span>
            <input class="input" type="url" formControlName="imagenUrl" placeholder="https://" />
            @if (invalido('imagenUrl')) {
              <small class="field-error">La URL admite hasta 255 caracteres. Usa un enlace más corto.</small>
            }
          </label>

          <div class="row-actions field-wide">
            <button class="btn" type="submit" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : editando() ? 'Guardar cambios' : 'Crear producto' }}
            </button>
            <button class="btn btn-quiet" type="button" (click)="cerrarForm()">Cancelar</button>
          </div>
        </form>
      </section>
    }

    @if (cargando()) {
      <p class="empty">Cargando productos…</p>
    } @else if (error()) {
      <div class="notice notice-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (productos().length === 0) {
      <div class="empty">
        <h2>El catálogo está vacío</h2>
        <p>Crea el primer producto para que los clientes puedan comprarlo.</p>
      </div>
    } @else {
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Categoría</th>
              <th scope="col" class="num">Precio</th>
              <th scope="col" class="num">Stock</th>
              <th scope="col">Sumar o restar stock</th>
              <th scope="col"><span class="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (p of productos(); track p.id) {
              <tr>
                <td>
                  <strong>{{ p.nombre }}</strong>
                  <span class="muted block">#{{ p.id }}</span>
                </td>
                <td>{{ p.categoria }}</td>
                <td class="num">{{ p.precio | clp }}</td>
                <td class="num" [class.stock-low]="p.stock <= 5">{{ p.stock }}</td>
                <td>
                  <div class="inline-form">
                    <input #delta class="input input-sm" type="number" step="1" placeholder="+10 o -3" [attr.aria-label]="'Ajuste de stock de ' + p.nombre" />
                    <button class="btn btn-quiet btn-sm" type="button" [disabled]="trabajando() === p.id" (click)="ajustar(p, delta)">
                      Aplicar
                    </button>
                  </div>
                </td>
                <td class="actions">
                  <button class="btn btn-quiet btn-sm" type="button" (click)="editar(p)">Editar</button>
                  @if (confirmando() === p.id) {
                    <button class="btn btn-danger btn-sm" type="button" [disabled]="trabajando() === p.id" (click)="desactivar(p)">
                      Confirmar baja
                    </button>
                    <button class="btn btn-text btn-sm" type="button" (click)="confirmando.set(null)">No</button>
                  } @else {
                    <button class="btn btn-text btn-sm" type="button" (click)="confirmando.set(p.id)">Dar de baja</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AdminProductosPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly formAbierto = signal(false);
  protected readonly editando = signal<Producto | null>(null);
  protected readonly guardando = signal(false);
  protected readonly trabajando = signal<number | null>(null);
  protected readonly confirmando = signal<number | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    categoria: ['', [Validators.required]],
    precio: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    descripcion: ['', [Validators.maxLength(500)]],
    imagenUrl: ['', [Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected invalido(campo: keyof ProductoInput): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.productos().subscribe({
      next: (lista) => {
        this.productos.set(lista);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(describirError(e));
        this.cargando.set(false);
      },
    });
  }

  protected nuevo(): void {
    this.editando.set(null);
    this.form.reset();
    this.formAbierto.set(true);
  }

  protected editar(p: Producto): void {
    this.editando.set(p);
    this.form.setValue({
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      stock: p.stock,
      descripcion: p.descripcion ?? '',
      imagenUrl: p.imagenUrl ?? '',
    });
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    this.formAbierto.set(false);
    this.editando.set(null);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const datos: ProductoInput = this.form.getRawValue();
    const actual = this.editando();
    this.guardando.set(true);

    const peticion = actual
      ? this.api.actualizarProducto(actual.id, datos)
      : this.api.crearProducto(datos);

    peticion.subscribe({
      next: (producto) => {
        this.toast.ok(actual ? `${producto.nombre} actualizado` : `${producto.nombre} publicado`);
        this.guardando.set(false);
        this.cerrarForm();
        this.cargar();
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.guardando.set(false);
      },
    });
  }

  protected ajustar(p: Producto, campo: HTMLInputElement): void {
    const cantidad = campo.valueAsNumber;
    if (!Number.isInteger(cantidad) || cantidad === 0) {
      this.toast.error('Escribe un número entero distinto de 0, por ejemplo 10 o -3.');
      return;
    }
    this.trabajando.set(p.id);
    this.api.ajustarStock(p.id, cantidad).subscribe({
      next: (actualizado) => {
        this.productos.update((lista) => lista.map((x) => (x.id === actualizado.id ? actualizado : x)));
        this.toast.ok(`${actualizado.nombre}: stock en ${actualizado.stock}`);
        campo.value = '';
        this.trabajando.set(null);
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.trabajando.set(null);
      },
    });
  }

  protected desactivar(p: Producto): void {
    this.trabajando.set(p.id);
    this.api.desactivarProducto(p.id).subscribe({
      next: () => {
        this.productos.update((lista) => lista.filter((x) => x.id !== p.id));
        this.toast.ok(`${p.nombre} salió del catálogo`);
        this.confirmando.set(null);
        this.trabajando.set(null);
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.trabajando.set(null);
      },
    });
  }
}
