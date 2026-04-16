# Front Guide

## Que hace `src/main.jsx`

`src/main.jsx` es el arranque del frontend.

Hace tres cosas:

1. monta React en `#root`
2. envuelve la app con `AuthProvider`
3. entrega la navegacion al `router`

## Como esta ordenado `src/`

### `app`

Aqui vive la infraestructura de la app.

- `router.jsx`: define pantallas y layouts
- `providers/`: estado global compartido
- `routes/`: guardas de navegacion como `ProtectedRoute`

### `pages`

Son las pantallas completas.

- `LoginPage`
- `DashboardPage`
- `InventoryPage`
- `ProductCreatePage`
- `ProductEditPage`
- `UsersPage`

### `components`

Piezas reutilizables de UI o layout.

- `ui/`: botones, cards, alerts, badges, headers
- `layout/`: sidebar y estructura privada
- `product/`: piezas del flujo de productos e imagenes

### `hooks`

Logica reutilizable basada en hooks.

- `useAuth`: consume el contexto de sesion
- `useImageSelection`: valida archivos y arma previews locales

### `services`

Hablan con la API.

La idea es que las paginas pidan `listProductsRequest()` o `loginRequest()`, y no escriban `fetch(...)` directo.

### `lib`

Configuracion y helpers pequeños del front.

- `config.js`: rutas, claves de storage y reglas globales
- `auth-storage.js`: leer y guardar la sesion local

### `styles`

Base visual global.

- `tokens.css`: variables CSS
- `reset.css`: reseteo
- `base.css`: tipografia, fondo y helpers globales

## Flujo principal de la app

### 1. Login

`LoginPage` envia email y password a `POST /api/admin/auth/login`.

Si la respuesta sale bien:

- se guarda el `accessToken`
- se guarda el admin
- la cookie `HttpOnly` de refresh la maneja el backend
- se navega a `/dashboard`

### 2. Bootstrap de sesion

Cuando recargas la app, `AuthProvider` intenta:

1. validar el token guardado contra `/me`
2. si falla por expiracion, pedir `/refresh`

Eso permite recuperar sesion sin obligarte a loguearte otra vez en cada recarga.

## 3. Ruta protegida

`ProtectedRoute` evita que alguien sin sesion vea pantallas privadas.

Importante:

- protege la navegacion del front
- no reemplaza la seguridad del backend

## 4. Layout privado

`AppShellLayout` arma la zona interna del SaaS:

- sidebar izquierdo
- contenido principal a la derecha

Las paginas privadas viven dentro de ese layout usando `Outlet`.

## 5. Dashboard

`DashboardPage` no usa un endpoint especial hoy.

Arma el resumen con:

- lista de productos
- lista de usuarios si el rol es `owner`

Eso deja el dashboard util sin inventar backend nuevo antes de tiempo.

## 6. Inventario

`InventoryPage` lista productos existentes y funciona como centro del modulo.

Desde ahi el usuario entiende:

- cuantos productos hay
- que estados tienen
- y como entrar al alta o la edicion

## 7. Crear y editar productos

`ProductCreatePage` sigue el flujo real actual:

1. crear producto
2. recibir `product.id`
3. subir imagenes con ese `id`

`ProductEditPage` agrega el resto del CRUD:

- actualizar producto
- eliminar producto
- subir mas imagenes
- cambiar portada
- cambiar `sort_order`
- eliminar imagenes

`useImageSelection` ayuda con:

- validacion de tipo
- validacion de tamaño
- previews locales
- limpieza de memoria con `URL.revokeObjectURL`

## 8. Usuarios

`UsersPage` es solo para `owner` y hoy ya puede:

- listar usuarios
- crear usuarios
- editar usuarios
- eliminar usuarios

La ruta se controla en el front con `RoleRoute`, pero la API igual debe controlar permisos del lado servidor.
