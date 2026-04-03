# Biblia del Proyecto Dealer Desk

## 1. Que es este proyecto hoy

Dealer Desk hoy es una API backend en Node.js + Express para administrar inventario de productos.

Su foco actual en el codigo es:
- productos
- imagenes de productos
- conexion a PostgreSQL
- subida de imagenes a Cloudinary

Aunque en los documentos existe una vision SaaS mas grande, el estado real del codigo actual todavia es una base inicial del modulo de inventario, es que se hara
de forma de un gateway.

## 2. Vision del producto

Segun los documentos del proyecto:
- Dealer Desk busca ser una plataforma SaaS para dealers
- cada dealer tendra su panel privado
- cada dealer tendra su sitio web publico
- y estare yo que sere el super-admin quien creara
  los sistemas.


## 3. Stack actual real

- Node.js
- Express
- PostgreSQL
- driver `pg`
- Cloudinary
- Multer
- Morgan
- CORS

Antes se usaba Sequelize.
Ahora la base de datos se maneja con SQL directo.

## 4. Flujo general de un request

Ejemplo: `POST /api/admin/products/:id/images`

1. El request entra a Express en `src/main.js`.
2. Pasa por middlewares globales como `cors`, `express.json` y `morgan`.
3. Llega a la ruta correcta en `src/routes/admin/product-images/product-image.routes.js`.
4. Se validan parametros y archivos.
5. La ruta llama al service correspondiente.
6. El service aplica reglas de negocio.
7. El service usa las entidades para leer o escribir en PostgreSQL.
8. Si hay imagenes, tambien habla con Cloudinary.
9. La ruta responde JSON.

## 5. Estructura de carpetas

### `src/main.js`

Punto de entrada del servidor.

Se encarga de:
- levantar Express
- registrar middlewares
- montar rutas
- probar conexion a PostgreSQL
- sincronizar tablas
- iniciar el puerto

### `src/config`

Configuraciones tecnicas del proyecto.

#### `src/config/db/db.js`

Contiene la conexion a PostgreSQL con `pg`.

Responsabilidades:
- crear el pool de conexiones
- exponer `query()`
- probar conexion con `authenticate()`
- crear tablas con `sync()`
- borrar y recrear tablas si `DB_SYNC_MODE=force`

#### `src/config/cloudinary/cloudinary.js`

Configura la conexion con Cloudinary.

#### `src/config/multer/multer.js`

Configura subida de archivos.

Responsabilidades:
- almacenar archivos en memoria
- limitar tamano
- aceptar solo tipos permitidos

### `src/routes`

Define endpoints HTTP.

Las rutas no deberian contener logica pesada.
Su trabajo es:
- recibir request
- validar
- llamar al service
- devolver respuesta

### `src/services`

Aqui vive la logica de negocio.

Ejemplos:
- verificar que un producto exista antes de operar con imagenes
- decidir cual imagen es portada
- borrar imagen en Cloudinary y luego en base de datos
- promover otra imagen como portada si se elimina la actual

### `src/entities`

Aunque el nombre dice `entities`, hoy funcionan como una mezcla de:
- modelo de acceso a datos
- repositorio SQL

Su trabajo es:
- ejecutar queries SQL
- devolver objetos con metodos como `update()` y `destroy()`

#### `product.entity.js`

Acceso SQL para productos.

Responsabilidades:
- crear productos
- listar productos
- obtener producto por id
- actualizar producto
- eliminar producto
- cargar imagenes relacionadas cuando se necesite

#### `product-image.entity.js`

Acceso SQL para imagenes.

Responsabilidades:
- crear una imagen
- crear muchas imagenes en un solo INSERT masivo
- listar imagenes
- buscar imagen por id
- actualizar imagen
- eliminar imagen
- contar imagenes por producto
- limpiar portada actual
- obtener primera imagen del producto

#### `admin.entity.js`

Acceso SQL para admins.

Hoy es base para autenticacion futura.

#### `helpers.entity.js`

Helpers para construir SQL parametrizado de forma mas clara.

Responsabilidades:
- generar partes de INSERT
- generar partes de UPDATE
- generar partes de WHERE
- adjuntar metodos a los registros devueltos

#### `associations.entity.js`

Antes servia para asociaciones de Sequelize.
Hoy no define relaciones reales.
Solo reexporta entidades y documenta que la relacion vive en PostgreSQL.

### `src/utils/validations`

Validaciones de entrada.

Su trabajo es rechazar requests invalidos antes de llegar al service.

## 6. Modelo de datos actual real

### Tabla `products`

Representa un producto publicado en el sitio web o en el sistema.

Campos principales:
- `id`
- `year`
- `brand`
- `model`
- `mileage`
- `price`
- `drive_train`
- `fuel_type`
- `vin_number`
- `description`
- `publish_status`
- `sale_status`
- `created_at`
- `updated_at`

### Tabla `product_images`

Representa una imagen asociada a un producto.

Campos principales:
- `id`
- `product_id`
- `cloudinary_public_id`
- `url`
- `sort_order`
- `is_cover`
- `created_at`

### Tabla `admins`

Representa usuarios administrativos.

Campos principales:
- `id`
- `email`
- `password_hash`
- `role`
- `is_active`
- `created_at`
- `updated_at`

## 7. Relaciones de base de datos

Relacion real implementada hoy:

- `products.id` -> clave primaria del producto
- `product_images.product_id` -> foreign key hacia `products.id`

Esto significa:
- un producto puede tener muchas imagenes
- una imagen pertenece a un solo producto

Ademas:
- existe `ON DELETE CASCADE`
- si un producto se elimina, PostgreSQL elimina sus imagenes

Tambien existe una regla para portadas:
- indice unico parcial para que un producto no tenga dos imagenes con `is_cover=true`

## 8. Como funciona la subida de imagenes hoy

Cuando se suben varias imagenes:

1. Se valida que el producto exista.
2. Los archivos se suben a Cloudinary.
3. Los resultados de Cloudinary se convierten en registros para la base.
4. Se hace un solo `INSERT` masivo en PostgreSQL.

Esto mejora respecto a insertar una fila por cada imagen.

Importante:
- hacia Cloudinary sigue existiendo una llamada por imagen
- hacia PostgreSQL ahora se hace un solo llamado para guardar todas

### Estructura de carpetas en Cloudinary

Las imagenes de productos se guardan con esta forma:

- `dealer_desk/{system}/{productId}`

Ejemplo:

- `dealer_desk/ford-malloa/550e8400-e29b-41d4-a716-446655440000`

Hoy el nombre del sistema se intenta resolver desde headers del gateway:
- `x-system-slug`
- `x-system-name`
- `x-tenant-slug`
- `x-tenant-name`

Si el gateway aun no envia ese contexto, se usa el fallback:
- `default-system`

Esto deja la estructura preparada para el SaaS futuro sin obligar todavia a tener la tabla `systems`.

## 9. Por que no todo puede ser un solo llamado

Cloudinary no recibe 30 archivos distintos en un solo upload normal del flujo actual.
Por eso:
- las subidas de archivos van una por una o en paralelo
- el guardado de metadatos en PostgreSQL si puede agruparse

Esta mezcla es normal en la vida real.

## 10. Seguridad actual

Puntos buenos:
- SQL parametrizado
- validaciones de UUID y tipos basicos
- limite de tamano y tipo en multer
- reglas de integridad en PostgreSQL

Puntos pendientes para futuro:
- autenticacion real para rutas admin
- autorizacion por roles
- manejo de errores mas controlado
- transacciones mas completas en operaciones compuestas
- rate limiting
- auditoria o activity log

## 11. Estados importantes

### `DB_SYNC_MODE=safe`

Modo normal.
No borra datos.
Solo asegura que las tablas existan.

### `DB_SYNC_MODE=force`

Modo de desarrollo para reiniciar.
Borra tablas y las vuelve a crear.

Se usa cuando quieras limpiar la base y empezar pruebas desde cero.

## 12. Como pensar la arquitectura actual

La forma mas simple de entender el proyecto es:

- rutas = entrada HTTP
- services = reglas del negocio
- entities = acceso SQL
- config = integraciones y configuracion
- validations = filtro de datos de entrada

Ese modelo mental es suficiente para trabajar comodo hoy.

## 13. Que cosas del futuro aun no estan hechas

Segun documentos y diagramas, faltaria en el futuro:
- systems o tenants
- users por system
- auth real
- site content
- activity log
- separacion mayor en servicios
- posible evolucion a arquitectura mas distribuida

Hoy eso debe verse como roadmap, no como codigo implementado.

## 14. Criterio de diseno actual

El proyecto hoy prioriza:
- claridad
- simplicidad
- facilidad para aprenderlo
- evitar sobreingenieria

La meta actual no es microservicios ni arquitectura compleja.
La meta actual es tener una base limpia, entendible y funcional.

## 15. Resumen corto

Hoy Dealer Desk es una API de inventario con:
- productos
- imagenes
- PostgreSQL
- Cloudinary
- SQL directo

La vision SaaS existe en documentos, pero el codigo actual todavia esta en etapa base.
