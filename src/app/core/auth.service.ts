import { Injectable, computed, signal } from '@angular/core';
import {
  AccountInfo,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';
import { environment } from '../../environments/environment';
import { Rol } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly msal = new PublicClientApplication({
    auth: {
      clientId: environment.clientId,
      authority: environment.authority,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin
    },
    cache: { cacheLocation: 'sessionStorage' },
  });

  private readonly cuenta = signal<AccountInfo | null>(null);

  readonly isLoggedIn = computed(() => this.cuenta() !== null);
  readonly nombre = computed(() => this.cuenta()?.name ?? this.cuenta()?.username ?? '');
  readonly correo = computed(() => this.cuenta()?.username ?? '');

  readonly roles = computed<Rol[]>(() => {
    const roles = this.cuenta()?.idTokenClaims?.['roles'];
    return Array.isArray(roles) ? (roles as Rol[]) : [];
  });

  /** Momento en que vence la sesión de Microsoft (claim exp del id token). */
  readonly sesionVence = computed<Date | null>(() => {
    const exp = this.cuenta()?.idTokenClaims?.['exp'];
    return typeof exp === 'number' ? new Date(exp * 1000) : null;
  });

  /** Se ejecuta una vez antes de que arranque la app: completa el retorno desde Microsoft. */
  async init(): Promise<void> {
    await this.msal.initialize();
    try {
      const resultado = await this.msal.handleRedirectPromise();
      if (resultado?.account) {
        this.msal.setActiveAccount(resultado.account);
      }
    } catch (error) {
      console.error('No se pudo completar el inicio de sesión', error);
    }
    const cuenta = this.msal.getActiveAccount() ?? this.msal.getAllAccounts()[0] ?? null;
    if (cuenta) {
      this.msal.setActiveAccount(cuenta);
    }
    this.cuenta.set(cuenta);
  }

  hasRole(...roles: Rol[]): boolean {
    const mios = this.roles();
    return roles.some((rol) => mios.includes(rol));
  }

  /** Pantalla de inicio según el rol: un despachador puro entra directo a sus despachos. */
  homePath(): string {
    const soloDespachador =
      this.hasRole('DESPACHADOR') && !this.hasRole('ADMIN') && !this.hasRole('CLIENTE');
    return soloDespachador ? '/despachos' : '/catalogo';
  }

  login(): Promise<void> {
    // select_account permite cambiar de usuario (cliente, despachador, admin) durante la demo.
    return this.msal.loginRedirect({ scopes: environment.scopes, prompt: 'select_account' });
  }

  logout(): Promise<void> {
    return this.msal.logoutRedirect({ account: this.cuenta() ?? undefined });
  }

  /** Token de acceso vigente; MSAL lo renueva solo cuando está por vencer. */
  async getToken(): Promise<string> {
    const account = this.cuenta();
    if (!account) {
      throw new Error('No hay una sesión iniciada.');
    }
    try {
      const resultado = await this.msal.acquireTokenSilent({
        scopes: environment.scopes,
        account,
      });
      return resultado.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        await this.msal.acquireTokenRedirect({ scopes: environment.scopes, account });
      }
      throw error;
    }
  }
}
