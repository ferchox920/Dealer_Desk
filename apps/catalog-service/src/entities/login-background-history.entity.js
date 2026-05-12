import { randomUUID } from 'node:crypto';
import { query } from '../config/db/db.js';

const LOGIN_BACKGROUND_HISTORY_SELECT = `
  id,
  image_url,
  photographer_name,
  photo_page_url,
  provider,
  selected_at
`;

const LoginBackgroundHistory = {
  async create(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO login_background_history (
          id,
          image_url,
          photographer_name,
          photo_page_url,
          provider,
          selected_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING ${LOGIN_BACKGROUND_HISTORY_SELECT}
      `,
      [
        randomUUID(),
        data.image_url,
        data.photographer_name ?? null,
        data.photo_page_url ?? null,
        data.provider,
      ],
    );

    return rows[0] ?? null;
  },

  async listUsedImageUrls(executor = query) {
    const { rows } = await executor(
      `
        SELECT DISTINCT image_url
        FROM login_background_history
        WHERE image_url IS NOT NULL
          AND image_url <> ''
      `,
    );

    return rows
      .map((row) => row.image_url)
      .filter(Boolean);
  },

  async deleteOlderThan({ daysToKeep, keepImageUrl }, executor = query) {
    const { rows } = await executor(
      `
        DELETE FROM login_background_history
        WHERE selected_at < NOW() - ($1::text || ' days')::interval
          AND ($2::text IS NULL OR image_url <> $2)
        RETURNING id
      `,
      [
        String(daysToKeep),
        keepImageUrl ?? null,
      ],
    );

    return rows.length;
  },
};

export default LoginBackgroundHistory;
