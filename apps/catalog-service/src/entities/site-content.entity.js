import { query } from '../config/db/db.js';

const SITE_CONTENT_SELECT = `
  id,
  hero_config,
  about_body,
  about_body_i18n,
  services,
  footer_summary,
  footer_summary_i18n,
  hours,
  social_links,
  whatsapp_config,
  location_config,
  default_public_language,
  sections_config,
  logo_path,
  logo_mime_type,
  logo_original_name,
  logo_updated_at,
  created_at,
  updated_at
`;

const SINGLE_SITE_CONTENT_ID = '8ad09a64-d218-490f-a3dd-0fc1184d940f';

const SiteContent = {
  async getCurrent(executor = query) {
    const { rows } = await executor(
      `
        SELECT ${SITE_CONTENT_SELECT}
        FROM site_content
        LIMIT 1
      `,
    );

    return rows[0] ?? null;
  },

  async upsert(data, executor = query) {
    const { rows } = await executor(
      `
        INSERT INTO site_content (
          id,
          hero_config,
          about_body,
          about_body_i18n,
          services,
          footer_summary,
          footer_summary_i18n,
          hours,
          social_links,
          whatsapp_config,
          location_config,
          default_public_language,
          sections_config,
          logo_path,
          logo_mime_type,
          logo_original_name,
          logo_updated_at,
          updated_at
        )
        VALUES ($1, $2::jsonb, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13::jsonb, $14, $15, $16, $17, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          hero_config = EXCLUDED.hero_config,
          about_body = EXCLUDED.about_body,
          about_body_i18n = EXCLUDED.about_body_i18n,
          services = EXCLUDED.services,
          footer_summary = EXCLUDED.footer_summary,
          footer_summary_i18n = EXCLUDED.footer_summary_i18n,
          hours = EXCLUDED.hours,
          social_links = EXCLUDED.social_links,
          whatsapp_config = EXCLUDED.whatsapp_config,
          location_config = EXCLUDED.location_config,
          default_public_language = EXCLUDED.default_public_language,
          sections_config = EXCLUDED.sections_config,
          logo_path = EXCLUDED.logo_path,
          logo_mime_type = EXCLUDED.logo_mime_type,
          logo_original_name = EXCLUDED.logo_original_name,
          logo_updated_at = EXCLUDED.logo_updated_at,
          updated_at = NOW()
        RETURNING ${SITE_CONTENT_SELECT}
      `,
      [
        SINGLE_SITE_CONTENT_ID,
        JSON.stringify(data.hero_config),
        data.about_body,
        JSON.stringify(data.about_body_i18n),
        JSON.stringify(data.services),
        data.footer_summary,
        JSON.stringify(data.footer_summary_i18n),
        JSON.stringify(data.hours),
        JSON.stringify(data.social_links),
        JSON.stringify(data.whatsapp_config),
        JSON.stringify(data.location_config),
        data.default_public_language,
        JSON.stringify(data.sections_config),
        data.logo_path ?? null,
        data.logo_mime_type ?? null,
        data.logo_original_name ?? null,
        data.logo_updated_at ?? null,
      ],
    );

    return rows[0] ?? null;
  },
};

export default SiteContent;
