import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';

const CLOUDINARY_CREDENTIAL_SELECT = `
  id,
  system_id,
  credentials_hash,
  validated_at,
  created_at,
  updated_at
`;

const PlatformSystemCloudinaryCredential = {
  async upsert(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO platform_system_cloudinary_credentials (
          id,
          system_id,
          encrypted_cloud_name,
          encrypted_api_key,
          encrypted_api_secret,
          credentials_hash,
          validated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (system_id)
        DO UPDATE SET
          encrypted_cloud_name = EXCLUDED.encrypted_cloud_name,
          encrypted_api_key = EXCLUDED.encrypted_api_key,
          encrypted_api_secret = EXCLUDED.encrypted_api_secret,
          credentials_hash = EXCLUDED.credentials_hash,
          validated_at = NOW(),
          updated_at = NOW()
        RETURNING ${CLOUDINARY_CREDENTIAL_SELECT}
      `,
      [
        uuidv4(),
        data.system_id,
        data.encrypted_cloud_name,
        data.encrypted_api_key,
        data.encrypted_api_secret,
        data.credentials_hash,
      ],
    );

    return rows[0];
  },

  async hasBySystemId(systemId, executor = query) {
    const { rows } = await executor(
      `
        SELECT EXISTS (
          SELECT 1
          FROM platform_system_cloudinary_credentials
          WHERE system_id = $1
        ) AS exists
      `,
      [systemId],
    );

    return rows[0]?.exists === true;
  },
};

export default PlatformSystemCloudinaryCredential;
