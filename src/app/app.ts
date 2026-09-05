import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';
import { ProductoService } from './services/producto';
import { UsuarioService } from './services/usuario';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule]
})
export class App implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  username: string | undefined = '';

  perfil: any = null;
  productos: any[] = [];
  ultimoProductoCreado: any = null;
  mensajeError: string = '';
  cargando = false;

  nuevoProducto = {
    nombre: '',
    descripcion: '',
    precio: null,
    stock: null,
    imagenUrl: ''
  };

  constructor(
    private msalService: MsalService,
    private productoService: ProductoService,
    private usuarioService: UsuarioService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.msalService.instance.initialize().then(() => {
      this.checkAccount();

      this.msalService.handleRedirectObservable().subscribe({
        next: (result) => {
          console.log('MSAL Redirect Result:', result);
          this.checkAccount();
        },
        error: (error) => console.error('Error MSAL:', error)
      });
    });
  }

  checkAccount() {
    const accounts: AccountInfo[] = this.msalService.instance.getAllAccounts();

    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.isLoggedIn = true;
      this.username = accounts[0].name;

      const claims: any = accounts[0].idTokenClaims;
      const roles: string[] = claims?.roles || [];
      this.isAdmin = roles.includes('ADMIN');

      this.cdr.detectChanges();
    } else {
      this.isLoggedIn = false;
      this.isAdmin = false;
    }
  }

  login() {
    this.msalService.loginRedirect({
      scopes: environment.apiConfig.scopes
    });
  }

  logout() {
    this.msalService.logoutRedirect();
  }

  probarApiGateway() {
    this.cargando = true;
    this.mensajeError = '';
    this.productoService.getProductos().subscribe({
      next: (data: any) => {
        this.productos = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensajeError = `Error ${err.status}: ${err.message}`;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  crearProducto() {
    this.cargando = true;
    this.mensajeError = '';
    this.productoService.crearProducto(this.nuevoProducto).subscribe({
      next: (data: any) => {
        this.ultimoProductoCreado = data;
        this.nuevoProducto = { nombre: '', descripcion: '', precio: null, stock: null, imagenUrl: '' };
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensajeError = `Error ${err.status}: ${err.statusText === 'Forbidden' ? 'No tienes permisos de ADMIN para crear productos' : err.message}`;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  verPerfil() {
    this.cargando = true;
    this.mensajeError = '';
    this.usuarioService.getPerfil().subscribe({
      next: (data) => {
        this.perfil = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.mensajeError = `Error ${err.status}: ${err.message}`;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}