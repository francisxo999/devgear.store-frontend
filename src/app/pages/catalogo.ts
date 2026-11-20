import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartStore } from '../core/cart.store';
import { describirError } from '../core/errors';
import { ClpPipe, iniciales, tonoDe } from '../core/format';
import { Producto, Recomendacion, TendenciaItem } from '../core/models';
import { ToastService } from '../core/toast.service';
import { Keycap } from '../shared/keycap';

type Orden = 'relevancia' | 'precio-asc' | 'precio-desc' | 'nombre' | 'nombre-desc';

/** "Periféricos" → "perifericos": compara sin tildes ni mayúsculas. */
function claveDe(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

@Component({
  selector: 'dg-catalogo',
  imports: [ClpPipe, Keycap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Catálogo</h1>
        <p class="muted">{{ visibles().length }} de {{ productos().length }} productos</p>
      </div>
      <div class="head-actions">
        <input
          class="input search"
          type="search"
          placeholder="Buscar producto"
          aria-label="Buscar producto"
          [value]="busqueda()"
          (input)="onBusqueda($event)"
        />
        <button class="btn btn-quiet filtro-btn" type="button" aria-haspopup="dialog" (click)="panelAbierto.set(true)">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 4h18l-7 8.5V20l-4-2v-5.5z" fill="currentColor" /></svg>
          Filtros
          @if (nFiltros() > 0) {
            <span class="filtro-n">{{ nFiltros() }}</span>
          }
        </button>
        <button class="btn btn-quiet" type="button" (click)="cargar()">Actualizar</button>
      </div>
    </div>

    @if (hayFiltros()) {
      <div class="activos" aria-label="Filtros aplicados">
        @if (busqueda().trim() !== '') {
          <button type="button" class="activo" (click)="busqueda.set('')">“{{ busqueda().trim() }}” <span aria-hidden="true">×</span></button>
        }
        @if (categoria() !== null) {
          <button type="button" class="activo" (click)="categoria.set(null)">{{ etiquetaCategoria() }} <span aria-hidden="true">×</span></button>
        }
        @if (precioMax() !== null) {
          <button type="button" class="activo" (click)="precioMax.set(null)">Hasta {{ precioMax()! | clp }} <span aria-hidden="true">×</span></button>
        }
        @if (soloStock()) {
          <button type="button" class="activo" (click)="soloStock.set(false)">Solo disponibles <span aria-hidden="true">×</span></button>
        }
        @if (soloFavoritos()) {
          <button type="button" class="activo" (click)="soloFavoritos.set(false)">Solo favoritos <span aria-hidden="true">×</span></button>
        }
        @if (orden() !== 'relevancia') {
          <button type="button" class="activo" (click)="orden.set('relevancia')">{{ etiquetaOrden() }} <span aria-hidden="true">×</span></button>
        }
        <button type="button" class="btn btn-quiet btn-sm" (click)="limpiar()">Limpiar todo</button>
      </div>
    }

    @if (panelAbierto()) {
      <div class="backdrop" (click)="panelAbierto.set(false)"></div>
      <aside class="panel" role="dialog" aria-modal="true" aria-label="Filtros del catálogo">
        <header class="panel-head">
          <h2>Filtros</h2>
          <button type="button" class="cerrar" aria-label="Cerrar filtros" (click)="panelAbierto.set(false)">×</button>
        </header>

        <div class="panel-body">
          <section class="sec">
            <h3>Buscar</h3>
            <input
              class="input"
              type="search"
              placeholder="Nombre del producto"
              aria-label="Buscar por nombre"
              [value]="busqueda()"
              (input)="onBusqueda($event)"
            />
          </section>

          <section class="sec">
            <h3>Ordenar por</h3>
            @for (o of opcionesOrden; track o.valor) {
              <label class="opt">
                <input type="radio" name="orden" [checked]="orden() === o.valor" (change)="orden.set(o.valor)" />
                <span>{{ o.texto }}</span>
              </label>
            }
          </section>

          <section class="sec">
            <h3>Precio</h3>
            <p class="precio-actual">Hasta {{ (precioMax() ?? precioTope()) | clp }}</p>
            <input
              class="rango"
              type="range"
              min="0"
              [max]="precioTope()"
              [step]="paso()"
              aria-label="Precio máximo"
              [value]="precioMax() ?? precioTope()"
              (input)="onPrecio($event)"
            />
            <div class="rango-ext"><span>{{ 0 | clp }}</span><span>{{ precioTope() | clp }}</span></div>
            <label class="opt">
              <input type="checkbox" [checked]="soloStock()" (change)="soloStock.set(!soloStock())" />
              <span>Solo disponibles</span>
            </label>
            <label class="opt">
              <input type="checkbox" [checked]="soloFavoritos()" (change)="soloFavoritos.set(!soloFavoritos())" />
              <span>Solo mis favoritos</span>
              <span class="chip-n">{{ favoritos().size }}</span>
            </label>
          </section>

          <section class="sec">
            <h3>Categorías</h3>
            @if (categorias().length > 8) {
              <input
                class="input"
                type="search"
                placeholder="Buscar categoría"
                aria-label="Buscar categoría"
                [value]="buscaCategoria()"
                (input)="onBuscaCategoria($event)"
              />
            }
            <div class="lista-cat">
              <label class="opt">
                <input type="radio" name="cat" [checked]="categoria() === null" (change)="categoria.set(null)" />
                <span>Todas</span>
                <span class="chip-n">{{ productos().length }}</span>
              </label>
              @for (c of categoriasPanel(); track c.clave) {
                <label class="opt">
                  <input type="radio" name="cat" [checked]="categoria() === c.clave" (change)="categoria.set(c.clave)" />
                  <span>{{ c.etiqueta }}</span>
                  <span class="chip-n">{{ c.total }}</span>
                </label>
              } @empty {
                <p class="muted small">Ninguna categoría coincide.</p>
              }
            </div>
          </section>
        </div>

        <footer class="panel-foot">
          <button type="button" class="btn btn-quiet" [disabled]="!hayFiltros()" (click)="limpiar()">Limpiar</button>
          <button type="button" class="btn" (click)="panelAbierto.set(false)">Ver {{ visibles().length }} productos</button>
        </footer>
      </aside>
    }

    @if (recs().length > 0 || tendencia().length > 0) {
      <section class="recs" aria-label="Recomendados y tendencia">
        <div class="recs-head">
          <div class="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              class="tab"
              [class.on]="vistaActiva() === 'recs'"
              [attr.aria-selected]="vistaActiva() === 'recs'"
              [disabled]="recs().length === 0"
              (click)="vista.set('recs')"
            >
              Recomendados para ti
            </button>
            <button
              type="button"
              role="tab"
              class="tab"
              [class.on]="vistaActiva() === 'tend'"
              [attr.aria-selected]="vistaActiva() === 'tend'"
              [disabled]="tendencia().length === 0"
              (click)="vista.set('tend')"
            >
              Tendencia ahora
            </button>
          </div>
          @if (!plegada()) {
            @if (vistaActiva() === 'recs' && favoritas().length > 0) {
              <span class="muted small">Según lo que miras y agregas: {{ favoritas().join(', ') }}</span>
            } @else if (vistaActiva() === 'tend') {
              <span class="muted small">{{ ventana() }} · en vivo con los eventos de Kafka</span>
            }
          }
          <button type="button" class="plegar" [attr.aria-expanded]="!plegada()" (click)="plegada.set(!plegada())">
            {{ plegada() ? 'Mostrar' : 'Ocultar' }}
          </button>
        </div>

        @if (!plegada()) {
          @if (vistaActiva() === 'recs') {
            <div class="recs-grid">
              @for (r of recs(); track r.productoId) {
                <article class="rec">
                  <dg-keycap [texto]="iniciales(r.nombre)" [tono]="tono(r.categoria)" tamano="md" />
                  <div class="rec-info">
                    <strong>{{ r.nombre }}</strong>
                    <span class="muted small">{{ r.motivo }}</span>
                    <span class="price">{{ r.precio | clp }}</span>
                  </div>
                  <button class="btn btn-sm" type="button" (click)="agregarReco(r)">Agregar</button>
                </article>
              }
            </div>
          } @else {
            <div class="tend-row">
              @for (t of tendencia(); track t.productoId; let i = $index) {
                <button type="button" class="tend-item" (click)="abrirDetalleId(t.productoId)">
                  <span class="rank">{{ i + 1 }}</span>
                  <span class="tend-info">
                    <strong>{{ t.nombre }}</strong>
                    <span class="muted small">{{ t.interacciones }} interacciones</span>
                  </span>
                  <span class="price">{{ t.precio | clp }}</span>
                </button>
              }
            </div>
          }
        }
      </section>
    }

    @if (cargando()) {
      <p class="empty">Cargando catálogo…</p>
    } @else if (error()) {
      <div class="notice notice-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-quiet btn-sm" type="button" (click)="cargar()">Reintentar</button>
      </div>
    } @else if (productos().length === 0) {
      <div class="empty">
        <h2>Aún no hay productos</h2>
        <p>Un administrador puede publicar el primero desde Administración → Productos.</p>
      </div>
    } @else if (visibles().length === 0) {
      <div class="empty">
        <h2>Nada coincide con tu búsqueda</h2>
        <p>Prueba con otra palabra o quita el filtro de categoría.</p>
      </div>
    } @else {
      <div class="grid">
        @for (p of visibles(); track p.id) {
          <div class="slot" [class.abierta]="abierta() === p.id">
          <article class="product" [class.agotado]="p.stock === 0">
            <div class="product-art" (click)="ver(p); abrirDetalle(p)">
              <button
                type="button"
                class="fav"
                [class.on]="esFavorito(p.id)"
                [attr.aria-pressed]="esFavorito(p.id)"
                [attr.aria-label]="esFavorito(p.id) ? 'Quitar ' + p.nombre + ' de favoritos' : 'Agregar ' + p.nombre + ' a favoritos'"
                (click)="alternarFavorito(p); $event.stopPropagation()"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.5 1.1 5.5 3.3C14 6.1 15.5 5 17.5 5 21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" />
                </svg>
              </button>
              @if (p.imagenUrl && !fallidas().has(p.id)) {
                <img [src]="p.imagenUrl" [alt]="p.nombre" loading="lazy" (error)="marcarFallida(p.id)" />
              } @else {
                <dg-keycap [texto]="iniciales(p.nombre)" [tono]="tono(p.categoria)" tamano="lg" />
              }
            </div>

            <div class="product-body" (click)="ver(p); alternar(p)">
              <span class="tag">{{ p.categoria }}</span>
              <h2 class="product-name">{{ p.nombre }}</h2>
              @if (p.descripcion) {
                <p class="product-desc">{{ p.descripcion }}</p>
              }
              <div class="product-meta">
                <strong class="price">{{ p.precio | clp }}</strong>
                @if (p.stock === 0) {
                  <span class="stock stock-out">Agotado</span>
                } @else if (p.stock <= 5) {
                  <span class="stock stock-low">Quedan {{ p.stock }}</span>
                } @else {
                  <span class="stock">{{ p.stock }} en stock</span>
                }
              </div>
            </div>

            <div class="product-actions">
              <div class="stepper" role="group" [attr.aria-label]="'Cantidad de ' + p.nombre">
                <button type="button" aria-label="Una unidad menos" [disabled]="p.stock === 0 || cantidad(p) <= 1" (click)="cambiar(p, -1)">−</button>
                <output>{{ cantidad(p) }}</output>
                <button type="button" aria-label="Una unidad más" [disabled]="p.stock === 0 || cantidad(p) >= p.stock" (click)="cambiar(p, 1)">+</button>
              </div>
              <button
                class="btn"
                type="button"
                [attr.aria-label]="'Agregar ' + p.nombre + ' al carrito'"
                [disabled]="p.stock === 0 || agregando() === p.id"
                (click)="agregar(p)"
              >
                {{ agregando() === p.id ? 'Agregando…' : 'Agregar' }}
              </button>
            </div>
          </article>
          </div>
        }
      </div>
    }

    @if (detalle(); as d) {
      <div class="backdrop" (click)="cerrarDetalle()"></div>
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="d.nombre">
        <button type="button" class="cerrar modal-x" aria-label="Cerrar detalle" (click)="cerrarDetalle()">×</button>
        <div class="modal-art">
          @if (d.imagenUrl && !fallidas().has(d.id)) {
            <img [src]="d.imagenUrl" [alt]="d.nombre" (error)="marcarFallida(d.id)" />
          } @else {
            <dg-keycap [texto]="iniciales(d.nombre)" [tono]="tono(d.categoria)" tamano="lg" />
          }
        </div>
        <div class="modal-info">
          <span class="tag">{{ d.categoria }}</span>
          <h2>{{ d.nombre }}</h2>
          <div class="modal-precio">
            <strong class="price">{{ d.precio | clp }}</strong>
            @if (d.stock === 0) {
              <span class="stock stock-out">Agotado</span>
            } @else if (d.stock <= 5) {
              <span class="stock stock-low">Quedan {{ d.stock }}</span>
            } @else {
              <span class="stock">{{ d.stock }} en stock</span>
            }
          </div>
          <p class="modal-desc">{{ d.descripcion || 'Este producto aún no tiene descripción.' }}</p>
          <div class="product-actions">
            <div class="stepper" role="group" [attr.aria-label]="'Cantidad de ' + d.nombre">
              <button type="button" aria-label="Una unidad menos" [disabled]="d.stock === 0 || cantidad(d) <= 1" (click)="cambiar(d, -1)">−</button>
              <output>{{ cantidad(d) }}</output>
              <button type="button" aria-label="Una unidad más" [disabled]="d.stock === 0 || cantidad(d) >= d.stock" (click)="cambiar(d, 1)">+</button>
            </div>
            <button class="btn" type="button" [disabled]="d.stock === 0 || agregando() === d.id" (click)="agregar(d)">
              {{ agregando() === d.id ? 'Agregando…' : 'Agregar al carrito' }}
            </button>
            <button type="button" class="btn btn-quiet" [attr.aria-pressed]="esFavorito(d.id)" (click)="alternarFavorito(d)">
              {{ esFavorito(d.id) ? '♥ En favoritos' : '♡ Favorito' }}
            </button>
          </div>
          @if (relacionados().length > 0) {
            <h3 class="rel-titulo">Más de {{ d.categoria }}</h3>
            <div class="rel">
              @for (r of relacionados(); track r.id) {
                <button type="button" class="rel-item" (click)="abrirDetalle(r)">
                  <strong>{{ r.nombre }}</strong>
                  <span class="price">{{ r.precio | clp }}</span>
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .recs {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-l);
        padding: 16px 18px;
        margin-bottom: 22px;
        box-shadow: var(--shadow);
      }
      .recs-head {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }
      .recs-head h2 {
        margin: 0;
        font-size: 1.05rem;
      }
      .recs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 12px;
      }
      .rec {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid var(--line-soft);
        border-radius: var(--radius-m);
      }
      .rec-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
      }
      .rec-info strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .product-art,
      .product-body {
        cursor: pointer;
      }
      .chip-n {
        margin-left: 4px;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--line-soft);
        color: var(--slate);
        font-size: 0.78rem;
      }
      .chip.on .chip-n {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
      .product-art {
        position: relative;
      }
      .fav {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 2;
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 1px solid var(--line);
        border-radius: 50%;
        background: var(--surface);
        color: var(--slate);
        cursor: pointer;
      }
      .fav svg {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }
      .fav.on {
        color: #e0245e;
        border-color: #e0245e;
      }
      .fav.on svg {
        fill: currentColor;
      }
      .tabs {
        display: flex;
        gap: 4px;
        padding: 3px;
        border-radius: 10px;
        background: var(--line-soft);
      }
      .tab {
        border: 0;
        border-radius: 8px;
        padding: 6px 14px;
        background: transparent;
        color: var(--slate);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .tab.on {
        background: var(--surface);
        color: inherit;
        box-shadow: 0 1px 3px rgba(15, 27, 42, 0.15);
      }
      .tab:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .plegar {
        margin-left: auto;
        border: 0;
        background: none;
        color: var(--cobalt);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .tend-row {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 10px;
      }
      .tend-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid var(--line-soft);
        border-radius: var(--radius-m);
        background: var(--surface);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .tend-item:hover {
        border-color: var(--cobalt);
      }
      .rank {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: var(--cobalt);
        color: #fff;
        font-weight: 700;
      }
      .tend-info {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
      .tend-info strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .modal {
        position: fixed;
        z-index: 41;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(820px, calc(100vw - 24px));
        max-height: calc(100vh - 24px);
        overflow-y: auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
        background: var(--surface);
        border-radius: var(--radius-l);
        box-shadow: 0 24px 60px rgba(15, 27, 42, 0.35);
      }
      .modal-x {
        position: absolute;
        top: 8px;
        right: 12px;
        z-index: 2;
      }
      .modal-art {
        display: grid;
        place-items: center;
        min-height: 260px;
        background: var(--line-soft);
        border-radius: var(--radius-l) 0 0 var(--radius-l);
        overflow: hidden;
      }
      .modal-art img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .modal-info {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 24px;
      }
      .modal-info h2 {
        margin: 0;
      }
      .modal-precio {
        display: flex;
        align-items: baseline;
        gap: 12px;
      }
      .modal-desc {
        margin: 0;
        line-height: 1.55;
      }
      .rel-titulo {
        margin: 8px 0 0;
        font-size: 0.82rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--slate);
      }
      .rel {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .rel-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 10px;
        border: 1px solid var(--line-soft);
        border-radius: var(--radius-m);
        background: var(--surface);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .rel-item:hover {
        border-color: var(--cobalt);
      }
      @media (max-width: 640px) {
        .modal {
          grid-template-columns: 1fr;
        }
        .modal-art {
          border-radius: var(--radius-l) var(--radius-l) 0 0;
          min-height: 180px;
        }
      }
      .filtro-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .filtro-n {
        min-width: 20px;
        padding: 0 6px;
        border-radius: 999px;
        background: var(--cobalt);
        color: #fff;
        font-size: 0.78rem;
        line-height: 20px;
        text-align: center;
      }
      .activos {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 18px;
      }
      .activo {
        border: 1px solid var(--line);
        background: var(--surface);
        border-radius: 999px;
        padding: 4px 12px;
        font: inherit;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
      }
      .activo:hover {
        border-color: var(--cobalt);
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 27, 42, 0.45);
        z-index: 40;
      }
      .panel {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: min(360px, 100vw);
        display: flex;
        flex-direction: column;
        background: var(--surface);
        box-shadow: 0 0 40px rgba(15, 27, 42, 0.3);
        z-index: 41;
        animation: entra 0.2s ease;
      }
      @keyframes entra {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid var(--line);
      }
      .panel-head h2 {
        margin: 0;
        font-size: 1.15rem;
      }
      .cerrar {
        border: 0;
        background: none;
        font-size: 1.8rem;
        line-height: 1;
        cursor: pointer;
        color: var(--slate);
      }
      .panel-body {
        flex: 1;
        overflow-y: auto;
      }
      .sec {
        padding: 16px 20px;
        border-bottom: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .sec h3 {
        margin: 0 0 2px;
        font-size: 0.82rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--slate);
      }
      .opt {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 4px 0;
        cursor: pointer;
        font-weight: 500;
      }
      .opt > span:first-of-type {
        flex: 1;
      }
      .lista-cat {
        max-height: 260px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      .precio-actual {
        margin: 0;
        font-weight: 700;
      }
      .rango {
        width: 100%;
        accent-color: var(--cobalt);
      }
      .rango-ext {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: var(--slate);
      }
      .panel-foot {
        display: flex;
        gap: 10px;
        justify-content: space-between;
        padding: 14px 20px;
        border-top: 1px solid var(--line);
      }
      .panel-foot .btn:last-child {
        flex: 1;
      }
      /* La celda tiene alto fijo: al agrandarse la tarjeta no empuja a las demás. */
      .slot {
        position: relative;
        height: 440px;
      }
      .slot .product {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        min-height: 100%;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      .slot.abierta,
      .slot:focus-within {
        z-index: 5;
      }
      .slot.abierta .product,
      .slot:focus-within .product {
        transform: scale(1.04);
        box-shadow: 0 18px 40px rgba(15, 27, 42, 0.22);
      }
      .slot.abierta .product-desc,
      .slot:focus-within .product-desc {
        display: block;
        -webkit-line-clamp: unset;
        overflow: visible;
      }
      @media (hover: hover) {
        .slot:hover {
          z-index: 5;
        }
        .slot:hover .product {
          transform: scale(1.04);
          box-shadow: 0 18px 40px rgba(15, 27, 42, 0.22);
        }
        .slot:hover .product-desc {
          display: block;
          -webkit-line-clamp: unset;
          overflow: visible;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .slot .product {
          transition: none;
        }
        .panel {
          animation: none;
        }
      }
    `,
  ],
})
export class CatalogoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartStore);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly busqueda = signal('');
  protected readonly categoria = signal<string | null>(null);
  protected readonly agregando = signal<number | null>(null);
  protected readonly cantidades = signal<Record<number, number>>({});
  protected readonly fallidas = signal<Set<number>>(new Set());
  protected readonly orden = signal<Orden>('relevancia');
  protected readonly precioMax = signal<number | null>(null);
  protected readonly soloStock = signal(false);
  protected readonly soloFavoritos = signal(false);
  protected readonly favoritos = signal<Set<number>>(new Set());
  protected readonly detalle = signal<Producto | null>(null);
  protected readonly tendencia = signal<TendenciaItem[]>([]);
  protected readonly ventana = signal('');
  protected readonly panelAbierto = signal(false);
  protected readonly vista = signal<'recs' | 'tend'>('recs');
  protected readonly plegada = signal(false);
  protected readonly buscaCategoria = signal('');
  protected readonly abierta = signal<number | null>(null);
  protected readonly recs = signal<Recomendacion[]>([]);
  protected readonly favoritas = signal<string[]>([]);
  private readonly vistas = new Map<number, number>();

  protected readonly iniciales = iniciales;

  protected readonly opcionesOrden: { valor: Orden; texto: string }[] = [
    { valor: 'relevancia', texto: 'Más recientes' },
    { valor: 'nombre', texto: 'Nombre: A - Z' },
    { valor: 'nombre-desc', texto: 'Nombre: Z - A' },
    { valor: 'precio-asc', texto: 'Precio: menor a mayor' },
    { valor: 'precio-desc', texto: 'Precio: mayor a menor' },
  ];

  @HostListener('document:keydown.escape')
  protected cerrarPanel(): void {
    this.panelAbierto.set(false);
    this.detalle.set(null);
  }

  // Si la pestaña elegida no tiene datos, se muestra la otra.
  protected readonly vistaActiva = computed<'recs' | 'tend'>(() => {
    const v = this.vista();
    if (v === 'recs' && this.recs().length === 0 && this.tendencia().length > 0) {
      return 'tend';
    }
    if (v === 'tend' && this.tendencia().length === 0 && this.recs().length > 0) {
      return 'recs';
    }
    return v;
  });

  protected readonly relacionados = computed(() => {
    const d = this.detalle();
    if (!d) {
      return [];
    }
    return this.productos()
      .filter((p) => p.id !== d.id && p.stock > 0 && claveDe(p.categoria) === claveDe(d.categoria))
      .slice(0, 4);
  });

  private claveFavoritos(): string {
    return `devgear.favoritos.${this.auth.correo()}`;
  }

  private cargarFavoritos(): void {
    try {
      const guardado = localStorage.getItem(this.claveFavoritos());
      this.favoritos.set(new Set<number>(guardado ? (JSON.parse(guardado) as number[]) : []));
    } catch {
      this.favoritos.set(new Set());
    }
  }

  protected esFavorito(id: number): boolean {
    return this.favoritos().has(id);
  }

  /** Los favoritos se guardan en el navegador; al marcar uno nuevo se avisa a Kafka (FAVORITO_AGREGADO). */
  protected alternarFavorito(p: Producto): void {
    const nuevo = new Set(this.favoritos());
    if (nuevo.has(p.id)) {
      nuevo.delete(p.id);
    } else {
      nuevo.add(p.id);
      this.toast.ok(`${p.nombre} en tus favoritos`);
      this.api.registrarFavorito(p.id).subscribe({
        next: () => this.recargarRecomendacionesTras(),
        error: () => undefined,
      });
    }
    this.favoritos.set(nuevo);
    try {
      localStorage.setItem(this.claveFavoritos(), JSON.stringify([...nuevo]));
    } catch {
      // Sin almacenamiento local los favoritos duran solo mientras la página esté abierta.
    }
  }

  protected abrirDetalle(p: Producto): void {
    this.detalle.set(p);
  }

  protected abrirDetalleId(id: number): void {
    const p = this.productos().find((x) => x.id === id);
    if (p) {
      this.ver(p);
      this.detalle.set(p);
    }
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  protected cargarTendencia(): void {
    this.api.tendencia().subscribe({
      next: (t) => {
        this.tendencia.set(t.items);
        this.ventana.set(t.ventana);
      },
      // Si ms-recomendaciones no responde, simplemente no se muestra la sección.
      error: () => this.tendencia.set([]),
    });
  }

  // "Perifericos" y "Periféricos" cuentan como la misma categoría.
  protected readonly categorias = computed(() => {
    const grupos = new Map<string, { clave: string; etiqueta: string; total: number }>();
    for (const p of this.productos()) {
      const clave = claveDe(p.categoria);
      const g = grupos.get(clave);
      const etiqueta = mayuscula(p.categoria.trim());
      if (!g) {
        grupos.set(clave, { clave, etiqueta, total: 1 });
        continue;
      }
      g.total++;
      // Entre "Perifericos" y "Periféricos" se muestra la que lleva tilde.
      if (etiqueta.toLowerCase() !== clave && g.etiqueta.toLowerCase() === clave) {
        g.etiqueta = etiqueta;
      }
    }
    return [...grupos.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
  });

  protected readonly precioTope = computed(() => {
    const mayor = Math.max(0, ...this.productos().map((p) => p.precio));
    return Math.max(10_000, Math.ceil(mayor / 10_000) * 10_000);
  });
  protected readonly paso = computed(() => (this.precioTope() > 200_000 ? 10_000 : 5_000));

  protected readonly categoriasPanel = computed(() => {
    const q = claveDe(this.buscaCategoria());
    return q ? this.categorias().filter((c) => claveDe(c.etiqueta).includes(q)) : this.categorias();
  });

  protected readonly etiquetaCategoria = computed(
    () => this.categorias().find((c) => c.clave === this.categoria())?.etiqueta ?? '',
  );

  protected readonly etiquetaOrden = computed(
    () => this.opcionesOrden.find((o) => o.valor === this.orden())?.texto ?? '',
  );

  protected readonly nFiltros = computed(
    () =>
      (this.categoria() !== null ? 1 : 0) +
      (this.busqueda().trim() !== '' ? 1 : 0) +
      (this.soloStock() ? 1 : 0) +
      (this.soloFavoritos() ? 1 : 0) +
      (this.precioMax() !== null ? 1 : 0) +
      (this.orden() !== 'relevancia' ? 1 : 0),
  );

  protected readonly hayFiltros = computed(
    () =>
      this.categoria() !== null ||
      this.busqueda().trim() !== '' ||
      this.soloStock() ||
      this.soloFavoritos() ||
      this.precioMax() !== null ||
      this.orden() !== 'relevancia',
  );

  protected readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const categoria = this.categoria();
    const tope = this.precioMax();
    const lista = this.productos().filter((p) => {
      if (categoria && claveDe(p.categoria) !== categoria) {
        return false;
      }
      if (this.soloStock() && p.stock === 0) {
        return false;
      }
      if (this.soloFavoritos() && !this.favoritos().has(p.id)) {
        return false;
      }
      if (tope !== null && p.precio > tope) {
        return false;
      }
      if (!texto) {
        return true;
      }
      return claveDe(`${p.nombre} ${p.descripcion ?? ''} ${p.categoria}`).includes(claveDe(texto));
    });
    switch (this.orden()) {
      case 'precio-asc':
        return [...lista].sort((a, b) => a.precio - b.precio);
      case 'precio-desc':
        return [...lista].sort((a, b) => b.precio - a.precio);
      case 'nombre':
        return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      case 'nombre-desc':
        return [...lista].sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
      default:
        return [...lista].sort((a, b) => b.id - a.id);
    }
  });

  ngOnInit(): void {
    this.cargarFavoritos();
    this.cargar();
    this.cargarRecomendaciones();
    this.cargarTendencia();
    // La tendencia se refresca sola: se ve moverse cuando otros clientes navegan.
    const reloj = setInterval(() => this.cargarTendencia(), 8000);
    this.destroyRef.onDestroy(() => clearInterval(reloj));
  }

  /** El usuario miró un producto: se avisa a ms-productos (-> Kafka) como máximo 1 vez cada 10 s por producto. */
  protected ver(p: Producto): void {
    const ahora = Date.now();
    if (ahora - (this.vistas.get(p.id) ?? 0) < 10_000) {
      return;
    }
    this.vistas.set(p.id, ahora);
    this.api.registrarVista(p.id).subscribe({
      next: () => this.recargarRecomendacionesTras(),
      error: () => undefined,
    });
  }

  protected cargarRecomendaciones(): void {
    this.api.recomendaciones().subscribe({
      next: (r) => {
        const vistos = new Set<string>();
        this.recs.set(
          r.recomendaciones.filter((x) => {
            const k = claveDe(x.nombre);
            return vistos.has(k) ? false : (vistos.add(k), true);
          }),
        );
        this.favoritas.set(r.categoriasFavoritas);
      },
      // Si ms-recomendaciones no responde, simplemente no se muestra la sección.
      error: () => this.recs.set([]),
    });
  }

  protected agregarReco(r: Recomendacion): void {
    const producto = this.productos().find((p) => p.id === r.productoId);
    if (producto) {
      this.agregar(producto);
    }
  }

  // Kafka entrega el evento al consumidor casi al instante; se espera un momento y se recalcula.
  private recargarRecomendacionesTras(): void {
    setTimeout(() => {
      this.cargarRecomendaciones();
      this.cargarTendencia();
    }, 1500);
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

  protected tono(categoria: string) {
    return tonoDe(claveDe(categoria));
  }

  protected onPrecio(evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.precioMax.set(valor >= this.precioTope() ? null : valor);
  }

  protected limpiar(): void {
    this.busqueda.set('');
    this.categoria.set(null);
    this.soloStock.set(false);
    this.soloFavoritos.set(false);
    this.precioMax.set(null);
    this.orden.set('relevancia');
    this.buscaCategoria.set('');
  }

  /** En pantallas táctiles no hay hover: tocar la tarjeta la agranda y vuelve a tocar la cierra. */
  protected alternar(p: Producto): void {
    this.abierta.update((id) => (id === p.id ? null : p.id));
  }

  protected onBuscaCategoria(evento: Event): void {
    this.buscaCategoria.set((evento.target as HTMLInputElement).value);
  }

  protected onBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected marcarFallida(id: number): void {
    this.fallidas.update((s) => new Set(s).add(id));
  }

  protected cantidad(p: Producto): number {
    return this.cantidades()[p.id] ?? 1;
  }

  protected cambiar(p: Producto, delta: number): void {
    const nueva = Math.min(Math.max(this.cantidad(p) + delta, 1), Math.max(p.stock, 1));
    this.cantidades.update((c) => ({ ...c, [p.id]: nueva }));
  }

  protected agregar(p: Producto): void {
    const cantidad = this.cantidad(p);
    this.agregando.set(p.id);
    this.api.agregarAlCarrito(p.id, cantidad).subscribe({
      next: () => {
        this.toast.ok(`${cantidad} × ${p.nombre} en tu carrito`);
        this.cantidades.update((c) => ({ ...c, [p.id]: 1 }));
        this.agregando.set(null);
        this.cart.refresh().subscribe({ error: () => undefined });
        this.recargarRecomendacionesTras();
      },
      error: (e: unknown) => {
        this.toast.error(describirError(e));
        this.agregando.set(null);
      },
    });
  }
}
