import { HttpErrorResponse } from '@angular/common/http';

/** Convierte cualquier error en un mensaje que el usuario pueda entender y accionar. */
export function describirError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.';
    }
    if (err.status === 401) {
      return 'Tu sesión expiró. Cierra sesión y vuelve a entrar.';
    }
    if (err.status === 403) {
      return 'Tu rol no tiene permiso para hacer esto.';
    }
    const body = err.error;
    const mensaje = typeof body === 'string' ? body : body?.message;
    if (mensaje) {
      return mensaje;
    }
    return `El servidor respondió con el error ${err.status}.`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Ocurrió un error inesperado.';
}
