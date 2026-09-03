import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiConfig.uri}/productos`; 

  getProductos() {
    return this.http.get(this.apiUrl);
  }

  // Función para crear productos
  crearProducto(producto: any) {
    return this.http.post(this.apiUrl, producto);
  }
}