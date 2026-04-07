// ============================================================================
// password.util.js
//
// Hash y verificación de contraseñas usando Argon2id.
//
// En este proyecto ya decidimos usar directamente Argon2id porque todavía
// estás en desarrollo y no hay usuarios legacy que debamos migrar.
// ============================================================================

import argon2 from 'argon2';
const ARGON2_MEMORY_COST = Number(process.env.ARGON2_MEMORY_COST || 65536);
const ARGON2_TIME_COST = Number(process.env.ARGON2_TIME_COST || 3);
const ARGON2_PARALLELISM = Number(process.env.ARGON2_PARALLELISM || 4);
const ARGON2_HASH_LENGTH = Number(process.env.ARGON2_HASH_LENGTH || 32);

function getArgon2Options() {
  return {
    type: argon2.argon2id,
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
    hashLength: ARGON2_HASH_LENGTH,
  };
}

async function hashPassword(plainPassword) {
  return await argon2.hash(plainPassword, getArgon2Options());
}

async function verifyPassword(plainPassword, passwordHash) {
  if (typeof passwordHash !== 'string') {
    return false;
  }

  return await argon2.verify(passwordHash, plainPassword);
}

export { hashPassword, verifyPassword };
