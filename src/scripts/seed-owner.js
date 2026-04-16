// ============================================================================
// seed-owner.js
//
// Bootstrap del primer owner del sistema.
//
// Soporta dos modos:
//  - con password => crea el owner listo para login
//  - sin password => crea owner pendiente y envia correo de setup
//
// Regla de seguridad:
//  - ya no existe una password hardcodeada por defecto
//  - SEED_OWNER_PASSWORD debe venir por entorno y pasar la misma policy fuerte
//    que el resto del sistema
//
// Si el owner ya existe:
//  - si sigue pendiente y vuelves a correr el script sin password, reenvia invite
//  - si ya existe con password, no lo pisa
// ============================================================================

import 'dotenv/config';
import db from '../config/db/db.js';
import { OWNER_ROLE } from '../constants/admin-roles.js';
import Admin from '../entities/admin.entity.js';
import passwordActionService from '../services/admin/auth/password-action.service.js';
import {
  getPasswordPolicyError,
  hashPassword,
} from '../utils/security/password.util.js';

const DEFAULT_OWNER_EMAIL = 'owner@dealerdesk.local';
const DEFAULT_OWNER_NAME = 'System Owner';

function normalizeEnvString(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

async function run() {
  await db.authenticate();
  await db.sync();

  const ownerEmail = (
    normalizeEnvString(process.env.SEED_OWNER_EMAIL, DEFAULT_OWNER_EMAIL) || DEFAULT_OWNER_EMAIL
  ).toLowerCase();
  const ownerPassword = normalizeEnvString(process.env.SEED_OWNER_PASSWORD, '');
  const ownerName = normalizeEnvString(process.env.SEED_OWNER_NAME, DEFAULT_OWNER_NAME) || DEFAULT_OWNER_NAME;
  const useInviteFlow = ownerPassword.length === 0;

  if (!useInviteFlow) {
    const passwordPolicyError = getPasswordPolicyError(ownerPassword);

    if (passwordPolicyError) {
      throw new Error(`SEED_OWNER_PASSWORD is invalid. ${passwordPolicyError}`);
    }
  }

  if (useInviteFlow) {
    await passwordActionService.ensurePasswordActionMailReady();
  }

  const existingOwner = await Admin.findOneByEmail(ownerEmail);

  if (existingOwner) {
    if (useInviteFlow && !existingOwner.password_hash) {
      const inviteDelivery = await passwordActionService.issueInviteForAdmin(existingOwner);

      console.log(
        inviteDelivery.email_sent
          ? `Owner invite re-sent: ${existingOwner.email}`
          : `Owner exists but invite email could not be delivered: ${existingOwner.email}`,
      );
      process.exit(0);
    }

    console.log(`Owner already exists: ${existingOwner.email}`);
    process.exit(0);
  }

  if (!useInviteFlow) {
    const owner = await Admin.create({
      name: ownerName,
      email: ownerEmail,
      password_hash: await hashPassword(ownerPassword),
      role: OWNER_ROLE,
      is_active: true,
    });

    console.log(`Owner created with password: ${owner.email}`);
    process.exit(0);
  }

  let inviteTokenPayload = null;
  const owner = await db.withTransaction(async (client) => {
    const executor = client.query.bind(client);
    const createdOwner = await Admin.create(
      {
        name: ownerName,
        email: ownerEmail,
        password_hash: null,
        role: OWNER_ROLE,
        is_active: true,
      },
      executor,
    );

    inviteTokenPayload = await passwordActionService.createInviteRecordForAdmin(createdOwner, {}, executor);
    return createdOwner;
  });

  const inviteDelivery = await passwordActionService.deliverInviteEmail(
    owner,
    inviteTokenPayload.plainToken,
    inviteTokenPayload.expiresAt,
  );

  console.log(
    inviteDelivery.email_sent
      ? `Owner created and invite sent: ${owner.email}`
      : `Owner created but invite email could not be delivered: ${owner.email}`,
  );
  process.exit(0);
}

run().catch((error) => {
  console.error('Error creating owner:', error.message);
  process.exit(1);
});
