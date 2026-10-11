// Única configuración: sirve igual en local (http://localhost:4200) y en AWS.
// La URI de redirección de MSAL se toma de window.location.origin, así que
// cada origen que uses debe estar registrado en Azure (tipo "Aplicación de página única").
export const environment = {
  clientId: '9182d5b6-da2c-4b41-849b-9887785e3cf0',
  authority: 'https://login.microsoftonline.com/e5372bf0-c5e3-4286-887c-79069f209c1f',
  // Scope de la API expuesta en Azure; el token resultante es el que valida el authorizer del Gateway.
  scopes: ['api://9182d5b6-da2c-4b41-849b-9887785e3cf0/Productos.Read'],
  // URL de invocación del API Gateway (sin barra final)
  apiUrl: 'https://wzb64bpffh.execute-api.us-east-1.amazonaws.com',
};
