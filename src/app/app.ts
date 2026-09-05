import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  imports: [RouterOutlet]
})
export class App implements OnInit {
  isLoggedIn = false;
  username: string | undefined = '';

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
    console.log('Cuentas activas en caché:', accounts);

    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.isLoggedIn = true;
      this.username = accounts[0].name;
      this.cdr.detectChanges();
    } else {
      this.isLoggedIn = false;
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
    console.log('Consultando API Gateway...');
    this.productoService.getProductos().subscribe({
      next: (data) => console.log('¡Éxito! Datos desde AWS:', data),
      error: (err) => console.error('Fallo en la petición:', err)
    });
  }

  registrarProductoPrueba() {
    const nuevoProducto = {
      nombre: 'Mouse Gamer RGB DevGear',
      descripcion: 'Mouse ergonómico de alta precisión',
      precio: 45.50,
      stock: 30,
      imagenUrl: 'https://ejemplo.com/mouse.png'
    };

    console.log('Enviando producto por POST...');
    this.productoService.crearProducto(nuevoProducto).subscribe({
      next: (data) => console.log('¡Producto creado con éxito por ADMIN!', data),
      error: (err) => console.error('Fallo al crear producto:', err)
    });
  }

  verPerfil() {
    console.log('Consultando perfil (ms-usuario)...');
    this.usuarioService.getPerfil().subscribe({
      next: (data) => console.log('Perfil obtenido:', data),
      error: (err) => console.error('Fallo al obtener perfil:', err)
    });
  }
}