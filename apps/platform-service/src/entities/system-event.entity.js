import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db/db.js';

const PlatformSystemEvent = {
  async create(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO platform_system_events (
          id, system_id, event_type, message, metadata
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING
          id,
          system_id,
          event_type,
          message,
          metadata,
          created_at
      `,
      [
        uuidv4(),
        data.system_id,
        data.event_type,
        data.message ?? null,
        JSON.stringify(data.metadata ?? {}),
      ],
    );

    return rows[0];
  },
};

export default PlatformSystemEvent;
