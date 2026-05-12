import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';

const DATABASE_CREDENTIAL_SELECT = `
  id,
  system_id,
  connection_hash,
  validated_at,
  created_at,
  updated_at
`;

const PlatformSystemDatabaseCredential = {
  async upsert(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO platform_system_database_credentials (
          id, system_id, encrypted_connection_string, connection_hash, validated_at
        )
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (system_id)
        DO UPDATE SET
          encrypted_connection_string = EXCLUDED.encrypted_connection_string,
          connection_hash = EXCLUDED.connection_hash,
          validated_at = NOW(),
          updated_at = NOW()
        RETURNING ${DATABASE_CREDENTIAL_SELECT}
      `,
      [
        uuidv4(),
        data.system_id,
        data.encrypted_connection_string,
        data.connection_hash,
      ],
    );

    return rows[0];
  },

  async hasBySystemId(systemId, executor = query) {
    const { rows } = await executor(
      `
        SELECT EXISTS (
          SELECT 1
          FROM platform_system_database_credentials
          WHERE system_id = $1
        ) AS exists
      `,
      [systemId],
    );

    return rows[0]?.exists === true;
  },
};

export default PlatformSystemDatabaseCredential;
