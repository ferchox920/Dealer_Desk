# Dealer Desk — Plan real de siguientes pasos

> Documento de trabajo pensado para **este proyecto real** y no para un proyecto imaginario.
>
> Este plan toma como base:
> - el código actual 
> - `documentos/mios/BIBLIA_PROYECTO.md`
> - `documentos/mios/COPILOT_CONTEXT.md`
> - `documentos/mios/DealerDesk_SaaS.md`


---

# 1) Cómo leer este documento

Este documento **sí es una guía de implementación**, pero **no es una biblia rígida**.

La idea es:
- respetar la realidad actual del proyecto
- tomar buenas decisiones de seguridad
- no sobrecomplicar antes de tiempo
- dejar comentarios que te ayuden a entender el porqué

## Regla principal

**La verdad del proyecto hoy está en el código actual.**

La visión SaaS y de microservicios existe, pero **todavía no es el estado real del backend**.

---

# 2) Lo que existe hoy de verdad

## Stack real actual

- Node.js
- Express
- PostgreSQL con `pg`
- Cloudinary
- Multer
- Morgan
- CORS
- JWT instalado, pero todavía sin flujo real completo de auth

## Módulos reales hoy

- CRUD de productos
- CRUD de imágenes de productos
- soporte base para `admins`
- creación automática de tablas con `db.sync()`

## Estructura real importante

- `src/main.js`
- `src/config/db/db.js`
- `src/entities/admin.entity.js`
- `src/entities/product.entity.js`
- `src/entities/product-image.entity.js`
- `src/services/admin/products/product.service.js`
- `src/services/admin/product-images/product-image.service.js`
- `src/routes/admin/products/product.routes.js`
- `src/routes/admin/product-images/product-image.routes.js`
- `src/utils/cloudinary-folder.util.js`

---

# 3) Decisión arquitectónica principal

## 3.1 Qué sabemos ahora

Según esta conversación, **cada sistema tendrá**:
- su propio sitio web
- su propio backend
- su propia base de datos

Eso cambia bastante la estrategia.

## 3.2 Conclusión

## Dentro de la base operativa de cada sistema NO hace falta `system_id`

Ejemplos:
- `products` no necesita `system_id`
- `product_images` no necesita `system_id`
- `admins` no necesita `system_id`

### Por qué
Porque esa base ya pertenece a una sola casa.

Si la base de datos es solo del Dealer A, entonces todo lo que está allí ya es del Dealer A.

## 3.3 Cuándo sí existe `system_id`

`system_id` sí tendría sentido en una **plataforma central futura**, por ejemplo:

- un sistema central donde tú creas dealers
- una base central con `systems`
- dominios/subdominios
- estados del sistema
- billing o suspensión/reactivación

Pero eso sería **otra capa**, no la base operativa del dealer.

---

# 4) Respuesta clara sobre Cloudinary

Tu decisión base está bien:

```txt
 dealer_desk/{system_slug}/{product_id}
```

Ejemplo:

```txt
 dealer_desk/demo-dealer/550e8400-e29b-41d4-a716-446655440000
```

## Idea clave para recordar

**La carpeta organiza, pero no autoriza.**

La carpeta de Cloudinary sirve para:
- orden
- limpieza
- trazabilidad
- borrado por producto

Pero **la seguridad real** sigue estando en:
- el backend
- el login
- los roles
- las rutas protegidas

---

# 5) Cómo probar todo aunque todavía no exista el primer sistema real

## Solución
Crear una **instancia local falsa** y tratarla como si fuera un dealer real.

Ejemplo:

- `SYSTEM_SLUG=dealer-desk-dev`
- `SYSTEM_NAME=Dealer Desk Local`
- base local `dealer_desk_dev`

Así puedes probar:
- login
- owner
- staff
- productos
- imágenes
- Cloudinary
- invitaciones
- refresh/logout

## Conclusión práctica

No necesitas esperar al primer cliente.
Tu entorno local puede ser tu primer sistema falso.

---

# 6) Qué se mantiene y qué cambia respecto a los documentos

## Se mantiene

De `BIBLIA_PROYECTO.md`:
- el código actual manda
- hoy el foco real es inventario + imágenes + PostgreSQL + Cloudinary
- `admins` es la base para auth futura

De `COPILOT_CONTEXT.md`:
- esto no es una arquitectura rígida
- simplicidad > sobreingeniería
- claridad > abstracción innecesaria

De `DealerDesk_SaaS.md`:
- el producto sí tiene visión SaaS
- existirán roles
- habrá panel privado y sitio público
- tú serás la super-admin de la plataforma

## Cambia

La parte multi-tenant con `system_id` en todo **no aplica dentro de cada base operativa** si cada sistema vive en su propia DB.

---

# 7) Decisión técnica principal para auth

## Recomendación

## Hacer auth dentro del mismo backend de cada sistema

### Sí hacer ahora
- módulo auth dentro del backend actual
- users/admins por sistema
- roles owner/staff
- login
- refresh
- logout
- invitaciones
- setup password

### No hacer todavía
- microservicio auth separado
- gateway obligatorio
- RS256 con `public.pem`/`private.pem`
- `GET /public-key`
- auth central para todos los dealers

## Por qué
Porque hoy eso te complicaría más de lo que te ayudaría.

**Simple también puede ser profesional.**

---

# 8) Decisión sobre contraseñas

## Recomendación práctica para este proyecto

Usar **bcrypt** ahora.

## Por qué
Porque para tu situación actual:
- es suficientemente profesional
- es fácil de entender
- es conocido
- te deja avanzar
- no te mete complejidad extra innecesaria

## Regla que debes recordar

**La contraseña no se desencripta.**

La contraseña:
- se recibe
- se transforma con hash
- se guarda el hash
- luego solo se compara

---

# 9) Decisión sobre sesiones

## Estrategia recomendada

- **access token**: JWT corto
- **refresh token**: token opaco aleatorio
- refresh token guardado en **cookie `HttpOnly`**
- refresh token guardado **hasheado en DB**

## Traducción mental simple

- access token = pulsera corta
- refresh token = pase delicado para pedir otra pulsera

## Regla importante

El refresh token es más sensible que el access token.
Por eso no conviene tratarlo como cualquier dato.

---

# 10) Estructura de carpetas propuesta

```txt
src/
  config/
    cloudinary/
      cloudinary.js
    db/
      db.js
    multer/
      multer.js
    security/
      cookies.js

  entities/
    admin.entity.js
    product.entity.js
    product-image.entity.js
    helpers.entity.js
    associations.entity.js

  middlewares/
    auth/
      require-auth.js
      authorize-roles.js
    errors/
      error-handler.js
    security/
      rate-limiters.js

  routes/
    admin/
      auth/
        auth.routes.js
      users/
        user.routes.js
      products/
        product.routes.js
      product-images/
        product-image.routes.js
    prueba.routes.js

  services/
    admin/
      auth/
        auth.service.js
      users/
        user.service.js
      products/
        product.service.js
      product-images/
        product-image.service.js

  utils/
    cloudinary-folder.util.js
    security/
      password.util.js
      token.util.js
    validations/
      admin/
        auth/
          auth.validation.js
        users/
          user.validation.js
        products/
          product.validation.js
        product-images/
          product-image.validation.js

  scripts/
    seed-owner.js

  main.js
```

---

# 11) Dependencias nuevas recomendadas

```bash
npm i helmet cookie-parser bcrypt express-rate-limit
```

## Para qué sirve cada una

- `helmet`: headers de seguridad
- `cookie-parser`: leer cookies del refresh token
- `bcrypt`: hash de contraseñas
- `express-rate-limit`: proteger login/refresh/invite/setup-password

---

# 12) `.env` recomendado para desarrollo local

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=dealer_desk_dev
DB_USER=postgres
DB_PASS=tu_password
DB_SYNC_MODE=safe

SYSTEM_SLUG=dealer-desk-dev
SYSTEM_NAME=Dealer Desk Local
DEFAULT_SYSTEM_FOLDER=dealer-desk-dev

ADMIN_APP_ORIGIN=http://localhost:5173

JWT_ACCESS_SECRET=pon_aqui_un_secreto_largo_y_fuerte
JWT_ISSUER=dealer-desk-admin
JWT_AUDIENCE=dealer-desk-admin-api
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
BCRYPT_COST=12
COOKIE_SECURE=false

SEED_OWNER_EMAIL=owner@dealerdesk.local
SEED_OWNER_PASSWORD=UnaClaveLargaYTemporal123!

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Nota
Si el `.env` del zip tiene secretos reales y ese archivo salió de tu máquina, rota esas credenciales.

---

# 13) Endurecimiento mínimo antes de auth

## Objetivo
Antes de meter login, dejar la base más seria.

## Cambios mínimos

1. cerrar CORS
2. agregar `helmet`
3. agregar `cookie-parser`
4. agregar error handler central
5. corregir uso de códigos HTTP
6. dejar de depender de headers del gateway para Cloudinary en esta etapa
7. mejorar validaciones de create/update

---

# 14) `main.js` recomendado

```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import db from './config/db/db.js';
import pruebaRoutes from './routes/prueba.routes.js';
import productRoutes from './routes/admin/products/product.routes.js';
import productImageRoutes from './routes/admin/product-images/product-image.routes.js';
import authRoutes from './routes/admin/auth/auth.routes.js';
import userRoutes from './routes/admin/users/user.routes.js';
import { errorHandler } from './middlewares/errors/error-handler.js';

const expressApp = express();

expressApp.disable('x-powered-by');

expressApp.use(helmet());
expressApp.use(cors({
  origin: process.env.ADMIN_APP_ORIGIN,
  credentials: true,
}));
expressApp.use(cookieParser());
expressApp.use(express.json());
expressApp.use(morgan('dev'));

expressApp.use('/api', pruebaRoutes);
expressApp.use('/api/admin/auth', authRoutes);
expressApp.use('/api/admin/users', userRoutes);
expressApp.use('/api/admin', productRoutes);
expressApp.use('/api/admin', productImageRoutes);

expressApp.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.authenticate();
    console.log('Conexion a la base de datos establecida.');

    const syncMode = (process.env.DB_SYNC_MODE || 'safe').toLowerCase();

    if (syncMode === 'force') {
      await db.sync({ force: true });
      console.log('DB sync FORCE completado.');
    } else {
      await db.sync();
      console.log('DB sync SAFE completado.');
    }

    expressApp.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();
```

---

# 15) Cambio importante en Cloudinary

Hoy `product-image.routes.js` intenta leer contexto desde headers del gateway.

Como todavía no existe gateway real para esto, conviene simplificar.

## Antes

```js
function getSystemContext(req) {
  return {
    systemName: req.headers['x-system-name'],
    systemSlug: req.headers['x-system-slug'],
    tenantName: req.headers['x-tenant-name'],
    tenantSlug: req.headers['x-tenant-slug'],
  };
}
```

## Ahora

```js
function getSystemContext() {
  return {
    systemName: process.env.SYSTEM_NAME,
    systemSlug: process.env.SYSTEM_SLUG,
  };
}
```

## Regla para recordar

Mientras no exista gateway real, el sistema actual se define por su `.env`, no por headers.

---

# 16) `cloudinary-folder.util.js` recomendado

```js
function normalizeFolderSegment(value, fallback) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function resolveSystemFolderName(context = {}) {
  return normalizeFolderSegment(
    context.systemSlug
      || context.systemName
      || process.env.SYSTEM_SLUG
      || process.env.SYSTEM_NAME
      || process.env.DEFAULT_SYSTEM_FOLDER,
    'default-system',
  );
}

function buildProductImagesFolder(context = {}) {
  const systemFolder = resolveSystemFolderName(context);
  const productId = normalizeFolderSegment(context.productId, 'unknown-product');

  return `dealer_desk/${systemFolder}/${productId}`;
}

export { buildProductImagesFolder, normalizeFolderSegment, resolveSystemFolderName };
```

---

# 17) Nuevas tablas y cambios de DB

## 17.1 Tabla `refresh_sessions`

```sql
CREATE TABLE IF NOT EXISTS refresh_sessions (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(255),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_admin_id
  ON refresh_sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_token_hash
  ON refresh_sessions(token_hash);
```

## 17.2 Tabla `invite_tokens`

```sql
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'staff')),
  invited_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_email
  ON invite_tokens(email);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_token_hash
  ON invite_tokens(token_hash);
```

## 17.3 Cambios útiles en `admins`

```sql
ALTER TABLE admins
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

ALTER TABLE admins
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE admins
ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;
```

## 17.4 Cambios útiles en `products`

```sql
ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS updated_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL;
```

## 17.5 Lo que NO agregaría aquí

No agregaría:
- `system_id`
- `tenant_id`

porque esta base ya es de un solo sistema.

---

# 18) Utilidades de seguridad

## `src/utils/security/password.util.js`

```js
import bcrypt from 'bcrypt';

const BCRYPT_COST = Number(process.env.BCRYPT_COST || 12);

export async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, BCRYPT_COST);
}

export async function verifyPassword(plainPassword, passwordHash) {
  return await bcrypt.compare(plainPassword, passwordHash);
}
```

## `src/utils/security/token.util.js`

```js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export function signAccessToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
    },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
}

export function generateOpaqueRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
```

## `src/config/security/cookies.js`

```js
export function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction && process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/api/admin/auth',
    maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
  };
}
```

---

# 19) Middlewares de auth

## `src/middlewares/auth/require-auth.js`

```js
import Admin from '../../entities/admin.entity.js';
import { verifyAccessToken } from '../../utils/security/token.util.js';

export async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        error: 'Authentication required.',
      });
    }

    const token = authorization.replace('Bearer ', '').trim();
    const payload = verifyAccessToken(token);
    const admin = await Admin.findByPk(payload.sub);

    if (!admin || !admin.is_active) {
      return res.status(401).json({
        status: 401,
        error: 'Invalid session.',
      });
    }

    req.user = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };

    next();
  } catch (_error) {
    return res.status(401).json({
      status: 401,
      error: 'Invalid or expired token.',
    });
  }
}
```

## `src/middlewares/auth/authorize-roles.js`

```js
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 403,
        error: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
}
```

## Regla SaaS para recordar

**Login no significa permiso total.**

Cada request sensible debe revisar:
- que exista usuario
- que esté activo
- que tenga rol suficiente

---

# 20) Rate limiting

## `src/middlewares/security/rate-limiters.js`

```js
import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many requests. Please try again later.',
  },
});
```

Aplicarlo en:
- login
- refresh
- invite
- setup-password

---

# 21) Error handler mínimo

## `src/middlewares/errors/error-handler.js`

```js
export function errorHandler(err, _req, res, _next) {
  console.error(err);

  return res.status(500).json({
    status: 500,
    error: 'Internal server error.',
  });
}
```

## Regla simple de códigos HTTP

- `400` → body inválido
- `401` → no autenticado
- `403` → autenticado pero sin permiso
- `404` → recurso no existe
- `413` → archivo demasiado grande
- `429` → demasiados intentos
- `500` → error interno

---

# 22) Auth service — flujo recomendado

## Login

1. buscar admin por email
2. validar que esté activo
3. comparar contraseña con bcrypt
4. crear access token corto
5. crear refresh token opaco
6. guardar hash del refresh token en `refresh_sessions`
7. guardar cookie `HttpOnly`
8. devolver access token + datos básicos del usuario

## Refresh

1. leer cookie
2. hashear valor recibido
3. buscar sesión válida
4. si no existe o está vencida/revocada → `401`
5. rotar refresh token
6. emitir nuevo access token
7. reemplazar cookie

## Logout

1. leer cookie
2. revocar sesión
3. limpiar cookie

---

# 23) `auth.service.js` base

```js
import { v4 as uuidv4 } from 'uuid';
import Admin from '../../../entities/admin.entity.js';
import db from '../../../config/db/db.js';
import { verifyPassword } from '../../../utils/security/password.util.js';
import { signAccessToken, generateOpaqueRefreshToken, sha256 } from '../../../utils/security/token.util.js';

class AuthService {
  async login({ email, password, userAgent, ipAddress }) {
    const admin = await Admin.findOneByEmail(email);

    if (!admin || !admin.is_active) {
      throw new Error('Invalid credentials.');
    }

    const passwordOk = await verifyPassword(password, admin.password_hash);

    if (!passwordOk) {
      throw new Error('Invalid credentials.');
    }

    const refreshToken = generateOpaqueRefreshToken();
    const refreshTokenHash = sha256(refreshToken);
    const accessToken = signAccessToken(admin);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30));

    await db.query(
      `
        INSERT INTO refresh_sessions (
          id, admin_id, token_hash, user_agent, ip_address, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        uuidv4(),
        admin.id,
        refreshTokenHash,
        userAgent ?? null,
        ipAddress ?? null,
        expiresAt,
      ],
    );

    await admin.update({ last_login_at: new Date() });

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }
}

export default new AuthService();
```

---

# 24) Auth routes propuestas

## Endpoints base

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/refresh`
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/invite`
- `POST /api/admin/auth/setup-password`

## Endpoints de usuarios

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

---

# 25) Roles de esta fase

## Owner

Puede:
- crear usuarios
- editar usuarios
- desactivar usuarios
- invitar staff
- crear productos
- editar productos
- borrar productos
- subir imágenes
- borrar imágenes

## Staff

Puede:
- crear productos
- editar productos
- subir imágenes
- quizá borrar imágenes

No puede:
- gestionar usuarios
- invitar staff
- tocar decisiones delicadas del sistema

## Nota
No hace falta inventar permisos complejos en esta etapa.
Primero owner/staff bien hechos.

---

# 26) Cómo proteger tus rutas actuales

## Productos

```js
productRoutes.get('/products', requireAuth, async (req, res) => { ... });

productRoutes.post(
  '/products',
  requireAuth,
  authorizeRoles('owner', 'staff'),
  validateCreateProduct,
  async (req, res) => { ... }
);
```

## Imágenes

```js
productImageRoutes.post(
  '/products/:id/images',
  requireAuth,
  authorizeRoles('owner', 'staff'),
  validateProductId,
  upload.array('images', 20),
  validateImageFiles,
  async (req, res) => { ... }
);
```

## Regla mental

Todo lo que sea panel admin debe vivir con la idea:

**si no está autenticado, no entra**

---

# 27) Validaciones que faltan hoy y conviene agregar

## Productos

En create/update conviene agregar reglas como:
- `year` razonable
- `price >= 0`
- `mileage >= 0`
- `brand` obligatoria en create
- `model` obligatoria en create
- `vin_number` longitud razonable
- `publish_status` solo valores permitidos
- `sale_status` solo valores permitidos

## Imágenes

- limitar realmente a 20 si esa será la regla final
- diferenciar error de multer (`413` / tipo inválido)
- no devolver `404` cuando falla upload

---

# 28) Seed del primer owner

## `src/scripts/seed-owner.js`

```js
import 'dotenv/config';
import db from '../config/db/db.js';
import Admin from '../entities/admin.entity.js';
import { hashPassword } from '../utils/security/password.util.js';

async function run() {
  await db.authenticate();
  await db.sync();

  const existing = await Admin.findOneByEmail(process.env.SEED_OWNER_EMAIL);

  if (existing) {
    console.log('Owner already exists.');
    process.exit(0);
  }

  const passwordHash = await hashPassword(process.env.SEED_OWNER_PASSWORD);

  const owner = await Admin.create({
    email: process.env.SEED_OWNER_EMAIL,
    password_hash: passwordHash,
    role: 'owner',
    is_active: true,
  });

  console.log('Owner created:', owner.email);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

---

# 29) Qué haría con la tabla `admins`

## Decisión recomendada

Dejar `admins` por ahora.

## Por qué
Porque hoy:
- el panel sigue siendo un panel admin
- los usuarios que entran son owner/staff
- renombrar a `users` ahora mismo mueve muchas piezas sin gran ganancia

## Posible futuro
Más adelante, si creas plataforma central y refactor grande, ahí evalúas si `admins` pasa a `users`.

---

# 30) Qué NO haría todavía

No haría todavía:
- microservicio auth
- gateway obligatorio
- plataforma central mezclada con esta base operativa
- super-admin dentro de la base del dealer
- `system_id` en tablas operativas
- 2FA obligatorio desde el primer paso
- permisos demasiado granulares

## Por qué
Porque todavía estás construyendo la base.

Primero:
- login seguro
- roles claros
- rutas protegidas
- productos/imágenes estables

Luego lo demás.

---

# 31) Hoja de ruta exacta

## Paso 1
Agregar dependencias:

```bash
npm i helmet cookie-parser bcrypt express-rate-limit
```

## Paso 2
Endurecer `main.js`.

## Paso 3
Agregar utilidades de seguridad:
- `password.util.js`
- `token.util.js`
- `cookies.js`

## Paso 4
Agregar tablas nuevas:
- `refresh_sessions`
- `invite_tokens`
- columnas extra en `admins`
- auditoría mínima en `products`

## Paso 5
Crear `seed-owner.js`.

## Paso 6
Crear módulo auth:
- login
- refresh
- logout

## Paso 7
Crear middlewares:
- `requireAuth`
- `authorizeRoles`

## Paso 8
Proteger rutas actuales de productos e imágenes.

## Paso 9
Crear gestión de usuarios owner/staff.

## Paso 10
Crear invitación y setup password.

## Paso 11
Más adelante:
- forgot password
- auditoría más fina
- plataforma central
- multisitio administrado desde super-admin

---

# 32) Frases para recordar cuando trabajes en este proyecto

## “Cada sistema es una casa”
Entonces su base operativa no necesita `system_id` en todo.

## “La carpeta ordena, no autoriza”
Cloudinary no reemplaza permisos.

## “Login no es permiso”
Siempre revisar rol en cada request.

## “La contraseña no se desencripta”
Se hashea y luego se compara.

## “El refresh token es más delicado que el access token”
Por eso va en cookie segura y hasheado en DB.

## “Simple también puede ser profesional”
No necesitas microservicios para hacerlo bien.

## “La verdad de hoy manda más que la visión de mañana”
Primero se construye sobre el código real.

---

# 33) Conclusión final

## Dirección recomendada para este proyecto

Para **Dealer Desk hoy**, la mejor dirección es:

- mantener un backend por sistema
- dejar auth dentro del mismo backend
- no usar `system_id` en las tablas operativas del dealer
- usar Argon2id
- usar access token corto
- usar refresh token opaco en cookie `HttpOnly`
- proteger rutas con middlewares de auth y rol
- organizar Cloudinary por `SYSTEM_SLUG/product_id`
- dejar la plataforma central como fase futura

## Traducción más simple posible

Primero construye bien la puerta de una casa real.
No montes todavía una central de llaves para todas las casas si ni siquiera has terminado la primera.

---

# 34) Próximo paso recomendado

El próximo trabajo ideal es implementar **en este orden**:

1. `main.js` endurecido
2. utilidades de seguridad
3. tablas de sesiones/invitaciones
4. seed owner
5. login/refresh/logout
6. middlewares de protección
7. proteger productos e imágenes
8. users + invite + setup password

Cuando eso esté estable, recién evaluas plataforma central o separación en servicios.
