import '@dealer-desk/shared-config/load-env';
import db from '../config/db/db.js';
import PlatformAdmin from '../entities/platform-admin.entity.js';
import { SUPER_ADMIN_ROLE } from '../constants/platform-roles.js';
import { ensurePlatformDatabaseReady } from '../utils/db/migration-runtime.util.js';
import { hashPassword } from '../utils/security/password.util.js';

const DEFAULT_EMAIL = 'platform@dealerdesk.local';
const DEFAULT_NAME = 'Platform Super Admin';
const DEFAULT_PASSWORD = 'DealerDeskPlatform123!';

async function run() {
  await db.authenticate();
  await ensurePlatformDatabaseReady();

  const email = (process.env.PLATFORM_SUPER_ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const name = (process.env.PLATFORM_SUPER_ADMIN_NAME || DEFAULT_NAME).trim();
  const plainPassword = process.env.PLATFORM_SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  const existingAdmin = await PlatformAdmin.findOneByEmail(email);

  if (existingAdmin) {
    console.log(`Platform super admin already exists: ${existingAdmin.email}`);
    return;
  }

  const passwordHash = await hashPassword(plainPassword);

  const admin = await PlatformAdmin.create({
    name,
    email,
    password_hash: passwordHash,
    role: SUPER_ADMIN_ROLE,
    is_active: true,
  });

  console.log(`Platform super admin created: ${admin.email}`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
