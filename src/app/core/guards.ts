import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './models';
import { ToastService } from './toast.service';

/** Solo usuarios con sesión; el resto va al login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).createUrlTree(['/login']);
};

/** El login solo se muestra a quien aún no inició sesión. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree([auth.homePath()]) : true;
};

/** Restringe una ruta a ciertos roles; si no corresponde, avisa y vuelve al inicio. */
export const roleGuard =
  (...roles: Rol[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    if (auth.hasRole(...roles)) {
      return true;
    }
    inject(ToastService).error('Tu rol no tiene acceso a esa sección.');
    return inject(Router).createUrlTree([auth.homePath()]);
  };
