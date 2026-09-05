* v1.0.0: Inicializacion del frontend e instalacion de MSAL.
* v1.1.0: Configuración del MsalInterceptor con protectedResourceMap apuntando a AWS API Gateway y ajuste del scope a Productos.Read.
* v1.2.0: Integración de ProductoService con API Gateway y botones de prueba (consultar productos, registrar producto como ADMIN) para validar el flujo end-to-end.
* v1.3.0: Integración con ms-usuario para consultar el perfil decodificado del token (nombre, correo, roles, oid).
* v1.4.0: Reemplazo de resultados por consola con UI real en pantalla (perfil, tabla de productos, producto creado). Formulario real de creación de producto visible solo para usuarios con rol ADMIN.
