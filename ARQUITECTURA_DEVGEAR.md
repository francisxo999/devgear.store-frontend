# Arquitectura e integración de DevGear

## 1. Descripción general

DevGear es una aplicación web orientada a la gestión de una tienda de productos tecnológicos.

El proyecto utiliza una arquitectura basada en microservicios, separando las responsabilidades del sistema en diferentes aplicaciones independientes.

El frontend está desarrollado con Angular y TypeScript, mientras que los microservicios del backend utilizan Java y Spring Boot.

## 2. Arquitectura del frontend

El frontend de DevGear utiliza Angular como framework principal.

La aplicación permite:

- Iniciar sesión mediante Microsoft.
- Consultar productos y filtrar por categoría.
- Administrar un carrito de compras.
- Generar y consultar órdenes.
- Gestionar despachos.
- Administrar productos y órdenes según los permisos del usuario.
- Consultar el perfil del usuario autenticado.

La comunicación con el backend se realiza mediante solicitudes HTTP.

El archivo `src/app/core/api.service.ts` centraliza las operaciones hacia las API.

## 3. Arquitectura de microservicios

El backend está dividido en seis microservicios:

| Microservicio | Responsabilidad |
|---|---|
| ms-productos | Gestión del catálogo y stock |
| ms-carrito | Administración del carrito de compras |
| ms-usuario | Consulta de información del usuario autenticado |
| ms-ordenes | Creación y consulta de órdenes |
| ms-despachos | Gestión de despachos y sus estados |
| ms-notificaciones | Envío de notificaciones por correo |

Esta separación permite organizar el sistema según responsabilidades específicas.

## 4. Integración con AWS

El frontend está configurado para utilizar un API Gateway de AWS como punto de entrada a las API.

El archivo `src/environments/environment.ts` contiene la dirección del API Gateway.

El servicio `ApiService` utiliza esa dirección para construir las solicitudes HTTP a los diferentes microservicios.

La ejecución local de Angular no implica necesariamente que las solicitudes se envíen a los contenedores Docker locales.

## 5. Autenticación y autorización

DevGear utiliza Microsoft Entra ID para la autenticación de usuarios.

La integración se realiza mediante MSAL.

El frontend obtiene tokens de acceso para realizar solicitudes a las API protegidas.

El proyecto contempla los roles:

- CLIENTE
- DESPACHADOR
- ADMIN

Los roles permiten mostrar funcionalidades diferentes según los permisos del usuario.

El backend debe validar los tokens y aplicar los controles de autorización correspondientes.

## 6. Bases de datos

El proyecto utiliza MySQL para almacenar la información de distintos microservicios.

En el entorno local se utilizan bases de datos para:

- Productos.
- Carrito.
- Órdenes.
- Despachos.

Los datos se mantienen mediante volúmenes Docker.

## 7. Comunicación mediante RabbitMQ

RabbitMQ permite implementar comunicación asíncrona entre microservicios.

Cuando se genera una orden, el sistema puede publicar un evento que será consumido por otros servicios.

Entre los procesos relacionados se encuentran:

- Actualización del stock.
- Gestión de despachos.
- Envío de notificaciones.

El intercambio de mensajes permite reducir el acoplamiento directo entre servicios.

## 8. Contenedores Docker

Docker permite ejecutar los componentes del proyecto en entornos aislados.

Docker Compose facilita la definición y ejecución de múltiples servicios.

Durante las pruebas locales se levantaron:

- 6 contenedores de microservicios.
- 4 contenedores MySQL.
- 1 contenedor RabbitMQ.

La configuración local es independiente del despliegue realizado en AWS.

## 9. Organización y mantenimiento

El proyecto utiliza Git y GitHub para el control de versiones.

Las modificaciones deben revisarse y probarse antes de integrarse en la rama de desarrollo.

Se recomienda evitar incluir contraseñas, tokens o archivos de configuración con información sensible en los commits.

## 10. Conclusión

La arquitectura de DevGear combina Angular, Spring Boot, MySQL, RabbitMQ, Docker, AWS y Microsoft Entra ID.

Estas tecnologías permiten separar responsabilidades, establecer comunicación entre servicios, gestionar información y proteger el acceso a las funcionalidades de la aplicación.

## 11. Flujo de una compra en DevGear

El proceso de compra permite comprender cómo se integran los diferentes componentes del sistema.

### Etapa 1. Selección de productos

El cliente consulta el catálogo mediante el frontend Angular y selecciona los productos que desea comprar.

Angular realiza solicitudes HTTP al backend para consultar los productos y administrar el carrito.

### Etapa 2. Creación de la orden

Cuando el cliente confirma la compra, el frontend envía una solicitud al microservicio de órdenes a través de la API configurada.

El microservicio procesa la solicitud y registra la orden en su base de datos MySQL.

### Etapa 3. Publicación del evento

Después de crear la orden, el microservicio de órdenes publica un evento de creación de orden mediante RabbitMQ.

RabbitMQ distribuye el mensaje a las colas vinculadas al exchange correspondiente.

### Etapa 4. Procesamiento de los consumidores

Los microservicios que consumen el evento pueden ejecutar sus respectivas responsabilidades:

- **Productos:** actualizar las existencias de los productos comprados.
- **Despachos:** registrar la información necesaria para gestionar el envío.
- **Notificaciones:** intentar enviar un correo de confirmación al cliente.

### Etapa 5. Consulta del estado

El usuario puede consultar sus órdenes desde el frontend.

Los usuarios con los permisos correspondientes también pueden consultar y administrar los estados de los despachos.

### Resumen del proceso

Frontend Angular → API Gateway → Microservicio de órdenes → MySQL y RabbitMQ → Microservicios consumidores.

Este flujo combina comunicación HTTP con mensajería asíncrona, permitiendo distribuir responsabilidades entre diferentes servicios.