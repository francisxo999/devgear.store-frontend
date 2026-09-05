import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private apiUrl = `${environment.apiConfig.uri}/usuario/me`;

  constructor(private http: HttpClient) {}

  getPerfil() {
    return this.http.get(this.apiUrl);
  }
}