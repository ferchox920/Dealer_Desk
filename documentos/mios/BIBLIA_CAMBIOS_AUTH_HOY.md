# Biblia de los Cambios de Auth de Hoy

> Documento de estudio pensado para ti.
>
> La idea es explicar **qué construimos hoy**, **por qué existe**, **cómo se conecta todo**, y **cómo probarlo con Postman y localhost**.
>
> Está escrito con intención pedagógica, no solo técnica.

---

# 1) Idea general de lo que construimos

Hoy no hicimos “un login suelto”.

Lo que construimos fue una **base de autenticación y gestión de usuarios para el panel admin**.

Eso significa:

- un usuario puede hacer login
- el backend valida sus credenciales
- el backend entrega un `access token`
- el backend guarda un `refresh token` en cookie `HttpOnly`
- el backend puede renovar sesiones
- el backend puede cerrar sesión
- un `owner` puede crear y gestionar usuarios del panel

## Traducción muy simple

Imagina una casa:

- la **contraseña** es la prueba de que eres quien dices ser
- el **access token** es una pulsera corta para entrar rápido
- el **refresh token** es una llave más delicada para pedir otra pulsera
- el **middleware** es el guardia que revisa si puedes pasar
- los **roles** dicen si además de entrar puedes hacer ciertas cosas

---

# 2) Qué archivos nacieron o cambiaron y para qué sirven

## `src/routes/admin/auth/auth.routes.js`

Aquí viven las rutas de autenticación:

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/refresh`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`

Estas rutas:

- reciben el request
- llaman al service correcto
- manejan la cookie del refresh token
- devuelven la respuesta JSON

## `src/services/admin/auth/auth.service.js`

Aquí vive la lógica real de autenticación.

Hace cosas como:

- buscar admin por email
- comparar contraseña con Argon2id
- generar access token
- generar refresh token
- guardar la sesión refresh en DB
- renovar sesión
- revocar sesión

## `src/utils/security/password.util.js`

Aquí vive el hash de contraseñas.

Hoy usamos **Argon2id**.

Eso significa:

- cuando guardas una contraseña, no guardas el texto original
- guardas un hash seguro
- cuando alguien hace login, comparas la contraseña enviada con ese hash

## `src/utils/security/token.util.js`

Aquí viven las utilidades de tokens.

Hace cosas como:

- firmar access tokens JWT
- verificar access tokens JWT
- generar refresh tokens opacos
- hashear refresh tokens para guardarlos en la DB

## `src/config/security/cookies.js`

Aquí vive el manejo de la cookie del refresh token.

Sirve para:

- escribir la cookie en la respuesta
- leer la cookie del request
- limpiarla en logout

## `src/middlewares/auth/require-auth.js`

Este middleware protege rutas.

Hace esto:

1. lee el header `Authorization`
2. revisa si viene `Bearer <token>`
3. verifica el JWT
4. busca el usuario en la DB
5. si todo está bien, deja `req.user`

## `src/middlewares/auth/authorize-roles.js`

Este middleware revisa permisos por rol.

Primero `requireAuth` responde:

- “¿Quién eres?”

Después `authorizeRoles` responde:

- “¿Qué puedes hacer?”

## `src/routes/admin/users/user.routes.js`

Son las rutas para gestionar usuarios del panel.

Hoy están pensadas para que `owner` administre usuarios `owner/staff`.

## `src/services/admin/users/user.service.js`

Aquí vive la lógica de usuarios del panel.

Hace cosas como:

- listar usuarios
- crear usuarios
- editar usuarios
- eliminar usuarios
- evitar cosas peligrosas como dejar el sistema sin ningún `owner`

## `src/constants/admin-roles.js`

Aquí centralizamos los roles.

Eso evita tener strings sueltos como `'owner'` o `'staff'` por todos lados.

Si mañana agregas `manager`, el cambio empieza aquí.

## `src/utils/validations/shared/common.validation.js`

Aquí pusimos validaciones compartidas, como UUID.

La idea es no repetir:

- regex
- mensajes
- estructura de respuesta

## `src/middlewares/http/trim-request-strings.js`

Este middleware recorta espacios al principio y al final de strings.

Ejemplo:

- entra `"  owner@mail.com  "`
- sale `"owner@mail.com"`

Esto se hace antes de que el request llegue a validaciones y services.

## `src/scripts/seed-owner.js`

Este script crea el primer `owner`.

Existe porque al principio tienes un problema clásico:

- todavía no hay usuarios
- si no hay usuarios, nadie puede hacer login
- si nadie puede hacer login, nadie puede crear usuarios desde el panel

Entonces este script crea la primera cuenta para arrancar.

---

# 3) Qué significa cada concepto importante

## ¿Qué es un `constraint`?

Un `constraint` es una **regla obligatoria de la base de datos**.

No es una sugerencia.
Es una regla que PostgreSQL hace cumplir.

Ejemplo real:

```sql
CHECK (role IN ('owner', 'staff'))
```

Eso significa:

- si intentas guardar `owner`, sí
- si intentas guardar `staff`, sí
- si intentas guardar `perrito`, no

La base lo rechaza.

## ¿Qué es un `guardrail`?

`guardrail` es una palabra informal para decir:

**“barrera de seguridad para evitar una tontera peligrosa”**

Ejemplo real de este proyecto:

- impedir que borres o desactives al último `owner`

Eso te protege de dejar el sistema sin administrador principal.

## ¿Qué significa “normalizar”?

Normalizar significa transformar un dato a una forma limpia y consistente.

Ejemplo:

- `"  Owner@Mail.com  "` → `"owner@mail.com"`

Nos sirve para:

- evitar errores por espacios
- evitar duplicados raros
- comparar siempre con el mismo formato

## ¿Qué es Argon2id?

Es el algoritmo que estamos usando para hashear contraseñas.

No desencripta.
No guarda el texto original.
No se puede “leer la contraseña desde el hash”.

Hace esto:

1. recibe contraseña plana
2. la convierte en hash seguro
3. guarda ese hash
4. en login compara la contraseña con ese hash

## ¿Qué es el access token?

Es un JWT corto.

Sirve para autenticar requests protegidos.

Va en:

```txt
Authorization: Bearer TU_TOKEN
```

## ¿Qué es el refresh token?

Es un token opaco largo.

No es JWT.
No lleva datos visibles del usuario.

Sirve solo para pedir un nuevo access token.

Lo guardamos en:

- cookie `HttpOnly`

Y en DB guardamos:

- el **hash** del refresh token

no el token original.

---

# 4) Qué flujo hace el sistema hoy

## Login

Flujo:

1. Postman manda email y password
2. el backend limpia espacios
3. busca el admin por email
4. compara contraseña con Argon2id
5. genera `accessToken`
6. genera `refreshToken`
7. guarda hash del refresh token en `refresh_sessions`
8. responde el access token
9. además guarda el refresh token como cookie

## Refresh

Flujo:

1. el request trae la cookie del refresh token
2. el backend la lee
3. hashea ese valor
4. busca la sesión en `refresh_sessions`
5. si está bien, la rota
6. crea un refresh token nuevo
7. responde un access token nuevo
8. devuelve una cookie nueva

## Logout

Flujo:

1. lee la cookie actual
2. revoca la sesión en DB
3. limpia la cookie

## `GET /me`

Flujo:

1. el request trae `Authorization: Bearer ...`
2. `requireAuth` verifica el token
3. busca el admin en DB
4. responde los datos del usuario actual

---

# 5) Qué tablas participan

## Tabla `admins`

Representa usuarios del panel.

Campos importantes hoy:

- `email`
- `password_hash`
- `role`
- `is_active`
- `last_login_at`
- `created_by_admin_id`

## Tabla `refresh_sessions`

Representa sesiones refresh activas o históricas.

Campos importantes:

- `admin_id`
- `token_hash`
- `user_agent`
- `ip_address`
- `expires_at`
- `revoked_at`
- `last_used_at`

---

# 6) Qué NO hace todavía este sistema

Muy importante: no confundirse.

## Ya existe

- login
- refresh
- logout
- me
- gestión de usuarios
- hash con Argon2id
- trim de strings
- validación UUID compartida

## Todavía NO quedó hecho hoy

- protección de rutas de productos e imágenes con auth/roles
- invitaciones por email
- setup-password
- forgot password
- rate limiting
- panel frontend real

O sea:

la base de auth ya está bastante seria,
pero todavía falta conectarla con todo el resto del sistema.

---

# 7) Qué significa “tunear” Argon2id con variables `.env`

Antes te dije que el siguiente paso podía ser agregar variables explícitas como:

- `ARGON2_MEMORY_COST`
- `ARGON2_TIME_COST`
- `ARGON2_PARALLELISM`
- `ARGON2_HASH_LENGTH`

## ¿Qué significa eso?

Significa que puedes controlar cuánta “fuerza” usa Argon2id.

### `ARGON2_MEMORY_COST`

Cuánta memoria usa el algoritmo.

Más alto:

- más seguro
- más pesado

### `ARGON2_TIME_COST`

Cuántas rondas hace.

Más alto:

- más seguro
- más lento

### `ARGON2_PARALLELISM`

Cuántos hilos/unidades de trabajo usa.

### `ARGON2_HASH_LENGTH`

Cuánto mide el hash resultante.

## ¿Necesitas tocar eso hoy?

No necesariamente.

Hoy ya tienes valores razonables por defecto en el código.

Entonces cuando dije “tunear”, quise decir:

**hacer configurable desde `.env` algo que hoy ya funciona con defaults**.

No era un error ni una urgencia.
Era solo una mejora opcional.

---

# 8) Cómo probar todo con Postman y localhost paso a paso

Esta es la parte más importante para practicar.

## Paso 1. Revisar `.env`

Asegúrate de tener al menos:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dealer_desk
DB_USER=postgres
DB_PASS=123
DB_SYNC_MODE=safe
ADMIN_APP_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=una_clave_larga_y_fuerte
JWT_ISSUER=dealer-desk-admin
JWT_AUDIENCE=dealer-desk-admin-api
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
COOKIE_SECURE=false
```

## Paso 2. Levantar PostgreSQL

Tienes que tener PostgreSQL corriendo localmente.

Si PostgreSQL no está prendido, el backend no arranca.

## Paso 3. Levantar el backend

En terminal:

```bash
npm run dev
```

Si todo está bien deberías ver algo como:

```txt
Conexion a la base de datos establecida.
DB sync SAFE completado.
Server running on port 3000
```

## Paso 4. Crear el primer owner

En otra terminal:

```bash
npm run seed:owner
```

Si ya existe, te dirá que ya existe.
Si no existe, lo crea.

## Paso 5. Preparar Postman

Usa esta base URL:

```txt
http://localhost:3000
```

Activa que Postman guarde cookies automáticamente.

Normalmente Postman ya lo hace solo.

## Paso 6. Probar login

### Request

`POST http://localhost:3000/api/admin/auth/login`

### Body JSON

```json
{
  "email": "owner@dealerdesk.local",
  "password": "ChangeMe123!"
}
```

### Qué esperar

- status `200`
- `accessToken` en el body
- cookie de refresh guardada por Postman

## Paso 7. Copiar el access token

Del body de login copia:

```txt
data.accessToken
```

## Paso 8. Probar `/me`

### Request

`GET http://localhost:3000/api/admin/auth/me`

### Headers

```txt
Authorization: Bearer TU_ACCESS_TOKEN
```

### Qué esperar

- status `200`
- datos del admin actual

## Paso 9. Crear un usuario staff

### Request

`POST http://localhost:3000/api/admin/users`

### Headers

```txt
Authorization: Bearer TU_ACCESS_TOKEN
Content-Type: application/json
```

### Body JSON

```json
{
  "name": "Juan Staff",
  "email": "staff@dealerdesk.local",
  "password": "Staff12345",
  "role": "staff",
  "is_active": true
}
```

### Qué esperar

- status `201`
- usuario creado

## Paso 10. Listar usuarios

### Request

`GET http://localhost:3000/api/admin/users`

### Headers

```txt
Authorization: Bearer TU_ACCESS_TOKEN
```

### Qué esperar

- status `200`
- lista de usuarios

## Paso 11. Editar un usuario

### Request

`PATCH http://localhost:3000/api/admin/users/UUID_DEL_USUARIO`

### Headers

```txt
Authorization: Bearer TU_ACCESS_TOKEN
Content-Type: application/json
```

### Body JSON ejemplo

```json
{
  "name": "Juan Staff Editado",
  "is_active": false
}
```

## Paso 12. Probar refresh token

No necesitas mandar body.

La cookie debería salir desde Postman automáticamente si quedó guardada en login.

### Request

`POST http://localhost:3000/api/admin/auth/refresh`

### Qué esperar

- status `200`
- access token nuevo
- refresh token nuevo en cookie

## Paso 13. Probar logout

### Request

`POST http://localhost:3000/api/admin/auth/logout`

### Qué esperar

- status `200`
- cookie borrada

## Paso 14. Confirmar que refresh ya no sirve

Después de logout:

### Request

`POST http://localhost:3000/api/admin/auth/refresh`

### Qué esperar

- `401`

Eso confirma que la sesión fue revocada.

---

# 9) Pruebas concretas para entender el trim de espacios

Esto es buenísimo para aprender.

## Caso 1. Login con espacios

Manda esto:

```json
{
  "email": "   owner@dealerdesk.local   ",
  "password": "   ChangeMe123!   "
}
```

Debería seguir funcionando porque el middleware recorta los bordes.

## Caso 2. Crear usuario con espacios

Manda esto:

```json
{
  "name": "   Maria   ",
  "email": "   maria@dealerdesk.local   ",
  "password": "   Maria12345   ",
  "role": "staff"
}
```

Se debería guardar limpio:

- `name` → `Maria`
- `email` → `maria@dealerdesk.local`
- `password` → hasheada ya sin bordes accidentales

---

# 10) Cómo responderle a tu profe qué construiste

Puedes decir algo así:

> Implementé una base de autenticación para el panel admin del proyecto.
> Definí usuarios administrativos con roles `owner` y `staff`.
> Usé Argon2id para hash de contraseñas.
> Implementé access token JWT corto y refresh token opaco en cookie `HttpOnly`.
> También agregué gestión de usuarios, normalización de strings, validaciones compartidas de UUID y una tabla de sesiones refresh en PostgreSQL.

Si te pregunta por seguridad, puedes decir:

> El refresh token no se guarda en claro en la base de datos, se guarda su hash.
> Además, la base de datos tiene constraints para asegurar integridad, por ejemplo restringiendo roles permitidos.

Si te pregunta por arquitectura, puedes decir:

> Mantuve `admins` como tabla actual de usuarios del panel para no sobrecomplicar en esta fase.
> Separé responsabilidades entre routes, services, middlewares, utils y entities.

---

# 11) Qué te recomiendo hacer después de estudiar esto

## Primero

Prueba todo el flujo con Postman.

## Después

Lee estos archivos en este orden:

1. `src/main.js`
2. `src/routes/admin/auth/auth.routes.js`
3. `src/services/admin/auth/auth.service.js`
4. `src/config/security/cookies.js`
5. `src/utils/security/token.util.js`
6. `src/utils/security/password.util.js`
7. `src/middlewares/auth/require-auth.js`
8. `src/middlewares/auth/authorize-roles.js`
9. `src/routes/admin/users/user.routes.js`
10. `src/services/admin/users/user.service.js`

## Luego

Explícate a ti mismo el flujo sin mirar el documento.

Si puedes contarlo con tus palabras, ya lo estás entendiendo de verdad.

---

# 12) Resumen final en modo muy simple

Hoy construiste:

- una puerta
- una llave corta
- una llave de renovación
- un guardia que revisa entrada
- permisos por rol
- gestión de usuarios del panel
- limpieza de inputs
- base de datos preparada para sesiones

No construiste todavía toda la casa.

Pero sí construiste **una entrada seria y profesional para la casa**.
