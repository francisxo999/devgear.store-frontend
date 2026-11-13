import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Bloqueo,
  Despacho,
  EstadoAntifraude,
  EstadoDespacho,
  ItemCarrito,
  MetricasNavegacion,
  MetricasPagos,
  Orden,
  PageResponse,
  PagoIniciado,
  PagoResultado,
  Perfil,
  Producto,
  ProductoInput,
  RecomendacionesRespuesta,
} from './models';

/** Todas las llamadas al API Gateway en un solo lugar. El token lo agrega el interceptor. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  // ms-productos
  productos(): Observable<Producto[]> {
    return this.http
      .get<PageResponse<Producto>>(`${this.base}/v1/productos`, {
        params: { size: 100, sort: 'nombre' },
      })
      .pipe(map((pagina) => pagina.content));
  }

  crearProducto(datos: ProductoInput): Observable<Producto> {
    return this.http.post<Producto>(`${this.base}/v1/productos`, datos);
  }

  actualizarProducto(id: number, datos: ProductoInput): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/v1/productos/${id}`, datos);
  }

  /** `cantidad` se suma al stock actual; con un valor negativo se resta. */
  ajustarStock(id: number, cantidad: number): Observable<Producto> {
    return this.http.patch<Producto>(`${this.base}/v1/productos/${id}/stock`, { cantidad });
  }

  desactivarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/v1/productos/${id}`);
  }

  /** El usuario miró un producto: ms-productos publica PRODUCTO_VISTO en Kafka. */
  registrarVista(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/v1/productos/${id}/vista`, null);
  }

  // ms-carrito
  carrito(): Observable<ItemCarrito[]> {
    return this.http.get<ItemCarrito[]>(`${this.base}/carrito`);
  }

  agregarAlCarrito(productoId: number, cantidad: number): Observable<ItemCarrito> {
    return this.http.post<ItemCarrito>(`${this.base}/carrito`, { productoId, cantidad });
  }

  cambiarCantidad(item: ItemCarrito, cantidad: number): Observable<ItemCarrito> {
    return this.http.put<ItemCarrito>(`${this.base}/carrito/${item.id}`, {
      productoId: item.productoId,
      cantidad,
    });
  }

  quitarDelCarrito(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/carrito/${itemId}`);
  }

  // ms-ordenes
  crearOrden(): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/ordenes`, null);
  }

  misOrdenes(): Observable<Orden[]> {
    return this.http.get<Orden[]>(`${this.base}/ordenes`);
  }

  todasLasOrdenes(): Observable<Orden[]> {
    return this.http.get<Orden[]>(`${this.base}/ordenes/admin`);
  }

  // ms-despachos
  despachos(): Observable<Despacho[]> {
    return this.http.get<Despacho[]>(`${this.base}/despachos`);
  }

  cambiarEstadoDespacho(id: number, estado: EstadoDespacho): Observable<Despacho> {
    return this.http.patch<Despacho>(`${this.base}/despachos/${id}/estado`, { estado });
  }

  // ms-usuario
  perfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.base}/usuario/me`);
  }

  // ms-recomendaciones
  recomendaciones(): Observable<RecomendacionesRespuesta> {
    return this.http.get<RecomendacionesRespuesta>(`${this.base}/recomendaciones`);
  }

  metricasNavegacion(): Observable<MetricasNavegacion> {
    return this.http.get<MetricasNavegacion>(`${this.base}/recomendaciones/metricas`);
  }

  // ms-pagos
  iniciarPago(): Observable<PagoIniciado> {
    return this.http.post<PagoIniciado>(`${this.base}/pagos/iniciar`, null);
  }

  confirmarPago(tokenWs: string): Observable<PagoResultado> {
    return this.http.post<PagoResultado>(`${this.base}/pagos/commit`, null, {
      params: { token_ws: tokenWs },
    });
  }

  anularPago(token: string): Observable<void> {
    return this.http.post<void>(`${this.base}/pagos/anular`, null, { params: { token } });
  }

  estadoPago(): Observable<EstadoAntifraude> {
    return this.http.get<EstadoAntifraude>(`${this.base}/pagos/estado`);
  }

  bloqueosDePago(): Observable<Bloqueo[]> {
    return this.http.get<Bloqueo[]>(`${this.base}/pagos/admin/bloqueos`);
  }

  desbloquearCliente(idCliente: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/pagos/admin/bloqueos/${encodeURIComponent(idCliente)}`);
  }

  metricasPagos(): Observable<MetricasPagos> {
    return this.http.get<MetricasPagos>(`${this.base}/pagos/admin/metricas`);
  }

  // ms-notificaciones
  enviarCorreo(to: string, subject: string, body: string): Observable<string> {
    return this.http.post(
      `${this.base}/notificaciones/enviar`,
      { to, subject, body },
      { responseType: 'text' },
    );
  }
}
