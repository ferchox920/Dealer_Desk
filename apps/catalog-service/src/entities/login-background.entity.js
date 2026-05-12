import { query } from '../config/db/db.js';

const LOGIN_BACKGROUND_SELECT = `
  id,
  image_url,
  photographer_name,
  photo_page_url,
  provider,
  updated_at
`;

const SINGLE_LOGIN_BACKGROUND_ID = 'd778ab3d-c3d6-4706-8139-0736f3f0ef7d';

const LoginBackground = {
  async getCurrent(executor = query) {
    const { rows } = await executor(
      `
        SELECT ${LOGIN_BACKGROUND_SELECT}
        FROM login_background
        LIMIT 1
      `,
    );

    return rows[0] ?? null;
  },

  async upsert(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO login_background (
          id,
          image_url,
          photographer_name,
          photo_page_url,
          provider,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          image_url = EXCLUDED.image_url,
          photographer_name = EXCLUDED.photographer_name,
          photo_page_url = EXCLUDED.photo_page_url,
          provider = EXCLUDED.provider,
          updated_at = NOW()
        RETURNING ${LOGIN_BACKGROUND_SELECT}
      `,
      [
        SINGLE_LOGIN_BACKGROUND_ID,
        data.image_url,
        data.photographer_name ?? null,
        data.photo_page_url ?? null,
        data.provider,
      ],
    );

    return rows[0] ?? null;
  },
};

export default LoginBackground;
