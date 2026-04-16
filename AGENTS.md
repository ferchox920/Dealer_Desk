# AGENTS.md

## Objetivo

Este archivo existe para que cualquier agente trabaje en Dealer Desk con contexto rapido, criterio consistente y sin repetir explicaciones largas que ya viven en tus documentos.

La idea principal es simple:

- usar el codigo real como fuente de verdad
- usar tus documentos buenos como referencia rapida
- evitar sobreingenieria
- mantener un estilo claro, profesional y entendible

## Jerarquia de verdad

Cuando haya dudas o conflicto entre documentos, seguir este orden:

1. `src/` y el comportamiento real del codigo
2. `documentos/mios/BIBLIA_PROYECTO.md`
3. `documentos/mios/BIBLIA_CAMBIOS_AUTH_HOY.md`
4. `documentos/mios/Dealer_Desk_plan_auth_saas.md`
5. `documentos/mios/COPILOT_CONTEXT.md`
6. `documentos/mios/DealerDesk_SaaS.md`

Regla corta:

- la verdad de hoy manda mas que la vision de manana

## Snapshot real del proyecto hoy

Dealer Desk hoy es un backend API en Node.js + Express para panel admin e inventario.

Stack real actual:

- Node.js
- Express
- PostgreSQL con `pg`
- SQL directo, no Sequelize en runtime
- Cloudinary
- Multer
- JWT
- Argon2id
- CORS
- Morgan

Modulos activos hoy:

- auth admin
- gestion de usuarios admin
- productos
- imagenes de productos
- seed del primer owner

Prefijos HTTP montados hoy:

- `/api` -> rutas de prueba
- `/api/admin/auth` -> auth del panel
- `/api/admin/users` -> usuarios del panel
- `/api/admin/products` -> productos
- `/api/admin/products/:id/images` -> imagenes de producto

Tablas operativas actuales:

- `admins`
- `refresh_sessions`
- `products`
- `product_images`

Roles reales hoy en codigo:

- `owner`
- `staff`

Importante:

- `super_admin` existe como idea de plataforma futura, no como rol operativo actual dentro de este backend
- `admins` hoy representa a los usuarios del panel; no crear otra tabla `users` sin un motivo claro y explicito

## Arquitectura real

Flujo mental del request:

1. `src/main.js`
2. middlewares globales
3. ruta
4. validaciones y middlewares especificos
5. service
6. entity
7. PostgreSQL y/o Cloudinary
8. respuesta JSON

Distribucion de responsabilidades:

- `src/main.js`: arranque del servidor, middlewares, montaje de rutas, DB sync
- `src/routes`: capa HTTP; debe ser delgada
- `src/middlewares`: auth, roles y preprocesamiento HTTP
- `src/services`: reglas de negocio y orquestacion
- `src/entities`: acceso SQL directo y devolucion de registros hidratados
- `src/config`: DB, Cloudinary, Multer, cookies
- `src/utils`: validaciones, seguridad, normalizacion, errores
- `src/scripts`: tareas manuales como seed inicial

Importante sobre las `entities`:

- aunque ya no se use Sequelize, varias APIs internas conservan una forma parecida a Sequelize como `include`, `where` u `order`
- eso es intencional para mantener el codigo simple y la migracion estable
- no romper ese contrato sin una razon fuerte

## Filosofia de trabajo en este repo

Estas ideas salen tanto del codigo como de tus documentos:

- simplicidad > sobreingenieria
- claridad > abstraccion innecesaria
- el codigo debe ser entendible por humanos, no solo "correcto"
- los comentarios deben explicar el por que cuando eso ayude
- no forzar microservicios, gateway ni arquitectura SaaS completa antes de tiempo

Frases que resumen bien este proyecto:

- cada sistema es una casa
- la carpeta ordena, no autoriza
- login no es permiso
- simple tambien puede ser profesional

## Guardrails tecnicos

Reglas practicas para no desviarse:

- no meter SQL en rutas
- no mover logica de negocio pesada a middlewares
- usar services para coordinar pasos compuestos
- usar `db.withTransaction(...)` cuando varias queries deban vivir o morir juntas
- si una operacion toca Cloudinary y DB, el service debe coordinar limpieza y rollback
- mantener SQL parametrizado
- reutilizar validaciones compartidas antes de inventar nuevas regex o formatos
- reutilizar `src/constants/admin-roles.js` para roles y permisos
- reutilizar `src/utils/errors/app-error.util.js` para errores de service nuevos

Reglas de modelo actual:

- dentro de este backend operativo no asumir `system_id` en todo
- `products`, `product_images` y `admins` hoy no deben cargarse con multi-tenant artificial
- si algun dia existe una plataforma central, eso sera otra capa

Reglas de auth:

- `requireAuth` responde quien eres
- `authorizeRoles(...)` responde que puedes hacer
- si proteges una ruta nueva, usar ambos en ese orden cuando aplique
- no asumir que "tener login" ya implica permiso

Reglas de Cloudinary:

- la carpeta actual sigue el patron `dealer_desk/{system-folder}/{productId}`
- hoy puede caer en `default-system`
- la carpeta solo organiza archivos; no reemplaza permisos del backend

## Convenciones de codigo

Patrones que ya existen y conviene mantener:

- comentarios explicativos y pedagogicos, sobre todo para decisiones o conceptos
- nombres tecnicos mayormente en ingles
- explicaciones y contexto muchas veces en espanol
- helpers pequenos y explicitos
- normalizacion de strings antes de validar o persistir cuando aplique
- respuestas JSON consistentes dentro de cada modulo

## Como le gusta programar al dueno del proyecto

Preferencia fuerte:

- codigo lineal, claro y facil de seguir
- funciones explicitas antes que magia o abstracciones raras
- validar pronto
- fallar pronto
- actuar despues de validar
- devolver errores con mensaje y codigo
- priorizar seguridad antes que comodidad

Patron mental preferido para funciones:

1. entrar
2. validar que exista lo necesario
3. validar formato o reglas
4. ejecutar la accion principal
5. responder o retornar
6. capturar error y devolver codigo claro

Forma de programar preferida:

- usar `if (!algo)` o checks tempranos para cortar rapido
- no enterrar validaciones importantes al final
- no mezclar demasiadas responsabilidades en una sola funcion
- usar `async/await` de forma directa y legible
- preferir nombres de funciones que expliquen que hacen
- si la logica tiene varios pasos, escribirlos en orden natural

Patron de route handler preferido:

```js
async function nombreFuncion(req, res) {
  try {
    if (!algoNecesario) {
      return res.status(400).json({
        status: 400,
        error: 'Mensaje claro.',
        code: 'CODIGO_CLARO',
      });
    }

    // validar datos
    // ejecutar accion
    const result = await algunService.hacerAlgo(req.body);

    return res.status(200).json({
      status: 200,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      status: error.statusCode || 500,
      error: error.message,
      code: error.code,
    });
  }
}
```

Patron de service preferido:

```js
async function hacerAlgo(data) {
  if (!data) {
    throw createHttpError(400, 'Data is required.', 'DATA_REQUIRED');
  }

  if (!data.id) {
    throw createHttpError(400, 'Id is required.', 'ID_REQUIRED');
  }

  const entity = await Algo.findByPk(data.id);

  if (!entity) {
    throw createHttpError(404, 'Resource not found.', 'RESOURCE_NOT_FOUND');
  }

  return await entity.update(data);
}
```

Lo importante no es copiar literalmente ese molde en todos lados.
Lo importante es respetar este estilo:

- validacion primero
- flujo facil de leer
- accion despues
- error controlado al final

Al agregar o cambiar codigo:

- preferir cambios locales y claros antes que refactors grandes
- mantener las rutas delgadas
- dejar la logica reutilizable en services, entities o utils
- si agregas una validacion UUID, preferir `createUuidParamValidator`
- si agregas un rol nuevo, empezar por `src/constants/admin-roles.js`

## Seguridad primero

La seguridad es prioridad alta en este proyecto.

Reglas concretas:

- no confiar en frontend, headers, body, params ni query sin validar
- si una ruta debe estar protegida, protegerla de verdad
- si una accion depende de rol, revisar rol de forma explicita
- preferir fail closed: si falta algo importante, negar la accion
- no devolver datos sensibles innecesarios
- mantener tokens, cookies y passwords con tratamiento cuidadoso
- antes de borrar o actualizar, confirmar que el recurso existe y que la accion esta permitida
- si una operacion compuesta falla, dejar rollback o limpieza clara

Checklist mental de seguridad antes de dar una tarea por terminada:

1. la entrada fue validada
2. el usuario fue autenticado si correspondia
3. el rol o permiso fue revisado si correspondia
4. la query esta parametrizada
5. el error devuelve codigo claro sin filtrar informacion sensible
6. la operacion no deja basura en Cloudinary o DB si falla a mitad de camino

## Estado actual de seguridad

Ya existe:

- login
- refresh
- logout
- `GET /me`
- access token JWT corto
- refresh token opaco en cookie `HttpOnly`
- hash de refresh token en DB
- hash de password con Argon2id
- gestion de usuarios owner/staff

Ojo con esto:

- auth ya existe, pero no todas las rutas del inventario estan endurecidas por igual
- si una tarea toca seguridad de productos o imagenes, revisar explicitamente si la ruta ya esta protegida o no

## Atajos de lectura por tarea

Para ahorrar contexto, no vuelvas a resumir todo si ya existe un documento bueno. Mejor referencia el archivo correcto.

Usa esta tabla mental:

- arquitectura real actual y flujo de inventario -> `documentos/mios/BIBLIA_PROYECTO.md`
- auth actual, users, sesiones, cookies, Postman, orden de lectura -> `documentos/mios/BIBLIA_CAMBIOS_AUTH_HOY.md`
- roadmap tecnico y decisiones futuras cercanas -> `documentos/mios/Dealer_Desk_plan_auth_saas.md`
- vision de producto y filosofia flexible -> `documentos/mios/COPILOT_CONTEXT.md`
- vision SaaS mas amplia del producto -> `documentos/mios/DealerDesk_SaaS.md`
- colecciones y entorno de pruebas -> `documentos/mios/Dealer_Desk_Admin_Users.postman_collection.json` y `documentos/mios/Dealer_Desk_Local.postman_environment.json`
- apoyo visual -> carpeta `diagramas/`

Atajo extra:

- si la pregunta es sobre llamadas de la API de auth o flujo de prueba, normalmente basta con mandar a leer `documentos/mios/BIBLIA_CAMBIOS_AUTH_HOY.md`
- si la pregunta es sobre arquitectura real del backend actual, normalmente basta con mandar a leer `documentos/mios/BIBLIA_PROYECTO.md`

## Tools disponibles en esta sesion

Ademas de leer el codigo y tus documentos locales, hay herramientas externas disponibles que conviene usar con criterio.

### Context7

Context7 esta disponible en esta sesion y sirve para consultar documentacion tecnica actualizada de librerias y frameworks.

Cuando conviene usarlo:

- dudas sobre APIs de librerias
- cambios de version
- ejemplos oficiales o cercanos a la documentacion oficial
- confirmar uso correcto de paquetes antes de implementar

Como usarlo mentalmente:

1. resolver el library id correcto
2. consultar la documentacion con ese id

Regla practica:

- si la duda es sobre una libreria o framework externo, preferir Context7 antes que improvisar de memoria
- si la respuesta ya esta en el codigo del repo o en `documentos/mios/`, priorizar eso primero

## Archivos clave por area

Auth y usuarios:

- `src/routes/admin/auth/auth.routes.js`
- `src/services/admin/auth/auth.service.js`
- `src/routes/admin/users/user.routes.js`
- `src/services/admin/users/user.service.js`
- `src/middlewares/auth/require-auth.js`
- `src/middlewares/auth/authorize-roles.js`
- `src/utils/security/password.util.js`
- `src/utils/security/token.util.js`
- `src/config/security/cookies.js`
- `src/entities/admin.entity.js`
- `src/scripts/seed-owner.js`

Inventario:

- `src/routes/admin/products/product.routes.js`
- `src/services/admin/products/product.service.js`
- `src/entities/product.entity.js`
- `src/utils/validations/admin/products/product.validation.js`

Imagenes:

- `src/routes/admin/product-images/product-image.routes.js`
- `src/services/admin/product-images/product-image.service.js`
- `src/entities/product-image.entity.js`
- `src/config/multer/multer.js`
- `src/config/cloudinary/cloudinary.js`
- `src/utils/cloudinary/cloudinary-folder.util.js`

DB y base tecnica:

- `src/main.js`
- `src/config/db/db.js`
- `src/utils/validations/shared/common.validation.js`
- `src/middlewares/http/trim-request-strings.js`

## Comandos utiles

Desarrollo local:

- `npm run dev`
- `npm run seed:owner`

Notas operativas:

- no hay suite de tests automatizados configurada en `package.json`
- para pruebas manuales usar Postman y los archivos dentro de `documentos/mios/`
- `DB_SYNC_MODE=safe` es el modo normal
- `DB_SYNC_MODE=force` resetea tablas en desarrollo

## Como decidir cuando un documento se queda viejo

Si un documento dice algo distinto al codigo actual:

- primero seguir el codigo
- luego decidir si conviene actualizar el documento o dejar una nota
- no implementar complejidad solo porque aparecia en una vision vieja

Caso importante ya visible en este repo:

- algunos documentos hablan de direccion futura SaaS o decisiones previas
- el codigo actual ya tiene auth real con Argon2id, JWT, refresh sessions y roles `owner`/`staff`

## Resultado esperado de un buen cambio aqui

Un cambio bueno en este proyecto suele cumplir esto:

- resuelve la necesidad real de hoy
- respeta la arquitectura actual
- no mete complejidad de plataforma futura sin necesidad
- deja el codigo un poco mas claro que antes
- mantiene el proyecto facil de seguir para ti
