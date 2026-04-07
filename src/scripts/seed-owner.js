// ============================================================================
// seed-owner.js
//
// Crea el primer owner del sistema actual para poder iniciar sesión y luego
// gestionar el resto de usuarios desde /api/admin/users.
// ============================================================================

import 'dotenv/config';
import db from '../config/db/db.js';
import { OWNER_ROLE } from '../constants/admin-roles.js';
import Admin from '../entities/admin.entity.js';
import { hashPassword } from '../utils/security/password.util.js';

const DEFAULT_OWNER_EMAIL = 'owner@dealerdesk.local';
const DEFAULT_OWNER_PASSWORD = 'ChangeMe123!';
const DEFAULT_OWNER_NAME = 'System Owner';

async function run() {
  // authenticate() prueba que PostgreSQL esté vivo.
  // sync() asegura que la tabla admins exista antes de querer insertar el owner.
  await db.authenticate();
  await db.sync();

  const ownerEmail = (process.env.SEED_OWNER_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || DEFAULT_OWNER_PASSWORD;
  const ownerName = process.env.SEED_OWNER_NAME || DEFAULT_OWNER_NAME;

  const existingOwner = await Admin.findOneByEmail(ownerEmail);

  if (existingOwner) {
    console.log(`Owner already exists: ${existingOwner.email}`);
    process.exit(0);
  }

  // Este script existe para resolver el clásico problema del arranque:
  // si todavía no tienes usuarios creados, nadie puede hacer login para
  // empezar a crear el resto. El seed crea la "primera llave" del sistema.
  const passwordHash = await hashPassword(ownerPassword);
  const owner = await Admin.create({
    name: ownerName,
    email: ownerEmail,
    password_hash: passwordHash,
    role: OWNER_ROLE,
    is_active: true,
  });

  console.log(`Owner created: ${owner.email}`);
  process.exit(0);
}

run().catch((error) => {
  console.error('Error creating owner:', error.message);
  process.exit(1);
});
