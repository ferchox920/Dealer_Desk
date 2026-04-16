# Bootstrap inicial de monorepo para microservicios

## Objetivo de esta etapa

Esta base no reemplaza todavia al backend actual.

La intencion es:

- mantener el monolito operativo actual en la raiz
- abrir una zona nueva para evolucion a microservicios
- empezar por `api-gateway` e `identity-service`
- abrir despues `catalog-service` para productos e imagenes
- mover codigo por etapas, no de golpe

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
   Aqui sigue viviendo el backend real actual.

2. `apps/`
   Aqui empieza la arquitectura nueva.

Regla importante:

- no mover logica productiva al azar
- primero crear la frontera
- despues copiar o extraer modulo por modulo

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
- crea y lista systems en una base configurable
- maneja `platform_admins` y refresh sessions propias
- trae script de seed para el primer `super_admin`
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

- `npm run monolith:dev`
- `npm run gateway:dev`
- `npm run identity:dev`
- `npm run catalog:dev`
- `npm run platform:dev`

Si solo quieres validar frontera HTTP sin una DB local lista:

- define `IDENTITY_SKIP_DB_CONNECT=true`

Eso sirve para probar:

- arranque del proceso
- healthchecks
- proxy del gateway

No sirve para validar login real ni lectura/escritura contra PostgreSQL.

## Orden sugerido de migracion

1. mantener el backend actual funcionando en `src/`
2. mover primero superficie HTTP de auth/users a `identity-service`
3. mover middlewares y utils compartidos que realmente valgan la pena a `packages/`
4. cuando identity quede claro, abrir `catalog-service`
5. estabilizar auth interna entre gateway y catalogo
6. abrir `platform-service` para la capa central SaaS
7. recien despues decidir si conviene separar repos

## Decision de arquitectura de esta etapa

La separacion elegida hoy es:

- `gateway` como borde
- `identity-service` como bounded context de identidad
- `catalog-service` como bounded context de inventario interno
- `platform-service` como bounded context central de plataforma SaaS
