# Bootstrap inicial de monorepo para microservicios

## Objetivo de esta etapa

Esta base ya paso la fase de bootstrap.

La intencion ahora es:

- usar microservicios como camino operativo normal
- dejar el monolito de raiz congelado como referencia legacy temporal
- mantener la migracion controlada, sin borrar contexto util demasiado pronto
- seguir apagando dependencias del arbol `src/` paso a paso

## Estructura creada

```txt
apps/
  api-gateway/
  catalog-service/
  identity-service/
  platform-service/
packages/
  shared-auth/
  shared-config/
  shared-http/
src/
  ... monolito actual ...
```

## Criterio de convivencia

Por ahora hay dos mundos:

1. `src/`
   Aqui vive el backend legacy congelado.

2. `apps/`
   Aqui vive la arquitectura operativa actual.

Regla importante:

- no reactivar el monolito como camino por defecto
- cualquier cambio nuevo debe caer primero en `apps/` o `packages/`
- `src/` solo se toca cuando hace falta cerrar la migracion o preservar compatibilidad temporal

## Responsabilidad de cada app nueva

### `apps/api-gateway`

Responsabilidad inicial:

- ser punto de entrada unico
- recibir requests
- enrutar a servicios
- dejar espacio para auth de borde, rate limiting y request ids

Por ahora hace solo:

- healthcheck
- proxy hacia `identity-service`
- proxy hacia `catalog-service`
- forwarding basico de contexto auth por headers internos
- agrega un secreto interno compartido para que los servicios acepten trafico solo desde gateway

### `apps/identity-service`

Responsabilidad objetivo:

- auth admin
- users admin
- refresh sessions
- password actions

Por ahora hace solo:

- healthchecks
- expone `/auth/*` y `/users/*` desde un proceso separado
- reutiliza temporalmente rutas, middlewares y services del backend actual
- exige secreto interno del gateway para cualquier ruta de aplicacion distinta de `/health`

Importante en esta fase:

- ya existe frontera HTTP de servicio
- auth/users ya usan rutas, middlewares, validators, services, DB, entities y mailers locales dentro de `apps/identity-service/src`
- dentro de `apps/identity-service/src` ya no quedan imports hacia `src/`
- el monolito de raiz sigue existiendo, pero identity ya tiene su propia base tecnica
- primero aislamos proceso y routing
- despues extraemos internals propios del bounded context

### `apps/catalog-service`

Responsabilidad objetivo:

- productos
- imagenes de productos
- reglas de publicacion y venta del catalogo
- integracion con Cloudinary para la galeria

Por ahora hace:

- healthchecks
- expone `/products/*` y `/products/:id/images/*` desde un proceso separado
- expone `/catalog/products` y `/catalog/products/:id` como superficie publica
- expone `/catalog/filters/brands` y `/catalog/filters/models`
- soporta paginacion y orden en el catalogo publico
- usa DB, entities, services y validaciones locales dentro de `apps/catalog-service/src`
- acepta auth reenviada por el gateway para proteger inventario sin volver a acoplar login
- exige secreto interno del gateway para no confiar en headers de auth enviados por clientes externos

### `apps/platform-service`

Responsabilidad objetivo:

- capa central SaaS
- systems o dealers
- estado del sistema
- metadata de dominios y URLs
- runs de provisioning

Por ahora hace:

- healthchecks
- expone `/auth/*`
- expone `/systems`
- expone `/systems/:id/provision` y historial de runs
- crea y lista systems en una base configurable
- maneja `platform_admins` y refresh sessions propias
- trae script de seed para el primer `super_admin`
- exige secreto interno del gateway para cualquier ruta distinta de `/health`
- usa `PLATFORM_DB_*` si existen, y en local puede caer a `DB_*` para no bloquear el desarrollo

## Packages compartidos

### `packages/shared-auth`

Helpers pequenos para:

- leer bearer token
- armar contexto auth reenviado por el gateway
- centralizar nombres de headers internos

### `packages/shared-config`

Helpers pequenos para:

- puertos
- URLs internas
- origen permitido del panel

### `packages/shared-http`

Helpers chicos para:

- respuestas de error consistentes
- health responses

## Scripts principales

Desde la raiz:

- `npm run dev`
- `npm run monolith:dev` con `ENABLE_LEGACY_MONOLITH=true`
- `npm run gateway:dev`
- `npm run identity:dev`
- `npm run catalog:dev`
- `npm run platform:dev`

Regla practica actual:

- `npm run dev` levanta `gateway`, `identity-service`, `catalog-service` y `platform-service`
- `npm run monolith:dev` queda solo para comparaciones legacy y requiere opt-in explicito
- aun con el monolito encendido, `/api/admin/*` ya no existe como superficie legacy operativa y responde `410`

Si solo quieres validar frontera HTTP sin una DB local lista:

- define `IDENTITY_SKIP_DB_CONNECT=true`

Eso sirve para probar:

- arranque del proceso
- healthchecks
- proxy del gateway

No sirve para validar login real ni lectura/escritura contra PostgreSQL.

## Orden sugerido de migracion

1. congelar `src/` como backend legacy
2. mantener `gateway + identity + catalog + platform` como stack operativo
3. mover seeds y bootstrap operativo fuera del monolito
4. retirar rutas legacy cuando ya no aporten verificacion
5. recien despues decidir si conviene borrar por completo el arbol viejo o separarlo

## Decision de arquitectura de esta etapa

La separacion elegida hoy es:

- `gateway` como borde
- `identity-service` como bounded context de identidad
- `catalog-service` como bounded context de inventario interno
- `platform-service` como bounded context central de plataforma SaaS
