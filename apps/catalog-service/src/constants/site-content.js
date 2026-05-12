import { DEFAULT_PUBLIC_LANGUAGE, normalizePublicLanguage } from './public-i18n.js';
import { normalizeLocalizedTextField } from '../utils/i18n/public-text.util.js';

const SITE_CONTENT_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const SITE_CONTENT_TEXT_LIMITS = {
  about_body: 500,
  footer_summary: 160,
  hero_description: 180,
  hero_eyebrow: 40,
  hero_title: 90,
  service_description: 160,
  service_title: 50,
};

const DEFAULT_SITE_CONTENT_HERO_CONFIG = {
  background_image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80',
  eyebrow: 'Quality used vehicles',
  eyebrow_i18n: normalizeLocalizedTextField({
    en: 'Quality used vehicles',
    es: 'Vehiculos usados de calidad',
  }),
  title: 'Find the right vehicle with clear details and a buying experience that feels simple.',
  title_i18n: normalizeLocalizedTextField({
    en: 'Find the right vehicle with clear details and a buying experience that feels simple.',
    es: 'Encuentra el vehiculo ideal con informacion clara y una compra mas simple.',
  }),
  description: 'Explore featured vehicles, compare options, and get ready for your next visit with confidence.',
  description_i18n: normalizeLocalizedTextField({
    en: 'Explore featured vehicles, compare options, and get ready for your next visit with confidence.',
    es: 'Explora vehiculos destacados, compara opciones y prepara tu visita con confianza.',
  }),
  primary_cta_label: 'View Inventory',
  primary_cta_label_i18n: normalizeLocalizedTextField({
    en: 'View Inventory',
    es: 'Ver inventario',
  }),
  secondary_cta_label: 'Call Now',
  secondary_cta_label_i18n: normalizeLocalizedTextField({
    en: 'Call Now',
    es: 'Llamar ahora',
  }),
};

const DEFAULT_SITE_CONTENT_ABOUT_BODY = 'We help drivers find quality used vehicles with a simpler, clearer buying experience and personal guidance at every step.';
const DEFAULT_SITE_CONTENT_ABOUT_BODY_I18N = normalizeLocalizedTextField({
  en: DEFAULT_SITE_CONTENT_ABOUT_BODY,
  es: 'Te ayudamos a encontrar vehiculos usados de calidad con una compra mas simple, clara y acompanamiento cercano en cada paso.',
});

const DEFAULT_SITE_CONTENT_SERVICES = [
  {
    slot: 1,
    is_active: true,
    title: 'Flexible Financing',
    title_i18n: normalizeLocalizedTextField({
      en: 'Flexible Financing',
      es: 'Financiamiento flexible',
    }),
    description: 'We help you explore financing options with clear next steps and guidance focused on your needs.',
    description_i18n: normalizeLocalizedTextField({
      en: 'We help you explore financing options with clear next steps and guidance focused on your needs.',
      es: 'Te ayudamos a explorar opciones de financiamiento con pasos claros y orientacion centrada en lo que necesitas.',
    }),
  },
  {
    slot: 2,
    is_active: true,
    title: 'Trade-In Support',
    title_i18n: normalizeLocalizedTextField({
      en: 'Trade-In Support',
      es: 'Tomamos tu usado',
    }),
    description: 'Bring your current vehicle and we will help you understand its value for your next purchase.',
    description_i18n: normalizeLocalizedTextField({
      en: 'Bring your current vehicle and we will help you understand its value for your next purchase.',
      es: 'Trae tu vehiculo actual y te ayudaremos a entender su valor para tu proxima compra.',
    }),
  },
  {
    slot: 3,
    is_active: true,
    title: 'Quality Inventory',
    title_i18n: normalizeLocalizedTextField({
      en: 'Quality Inventory',
      es: 'Inventario de calidad',
    }),
    description: 'Every featured vehicle is shown with real photos, key details, and the information you need before visiting.',
    description_i18n: normalizeLocalizedTextField({
      en: 'Every featured vehicle is shown with real photos, key details, and the information you need before visiting.',
      es: 'Cada vehiculo destacado se muestra con fotos reales, detalles clave y la informacion que necesitas antes de visitarnos.',
    }),
  },
];

const DEFAULT_SITE_CONTENT_FOOTER_SUMMARY = 'Quality used vehicles, clear information, and a smoother experience from the first click to the first drive.';
const DEFAULT_SITE_CONTENT_FOOTER_SUMMARY_I18N = normalizeLocalizedTextField({
  en: DEFAULT_SITE_CONTENT_FOOTER_SUMMARY,
  es: 'Vehiculos usados de calidad, informacion clara y una experiencia mas fluida desde el primer clic hasta salir manejando.',
});

const DEFAULT_SITE_CONTENT_HOURS = [
  { day_key: 'monday', is_closed: false, open_time: '08:00', close_time: '18:00' },
  { day_key: 'tuesday', is_closed: false, open_time: '08:00', close_time: '18:00' },
  { day_key: 'wednesday', is_closed: false, open_time: '08:00', close_time: '18:00' },
  { day_key: 'thursday', is_closed: false, open_time: '08:00', close_time: '18:00' },
  { day_key: 'friday', is_closed: false, open_time: '08:00', close_time: '18:00' },
  { day_key: 'saturday', is_closed: false, open_time: '09:00', close_time: '16:00' },
  { day_key: 'sunday', is_closed: true, open_time: null, close_time: null },
];

const DEFAULT_SITE_CONTENT_SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook (Meta)', is_active: false, url: '' },
  { key: 'instagram', label: 'Instagram', is_active: false, url: '' },
];

const DEFAULT_SITE_CONTENT_WHATSAPP = {
  is_active: false,
  phone_number: '',
  prefilled_message: "Hello, I'm interested in this listing: {{product_name}}",
};

const DEFAULT_SITE_CONTENT_LOCATION = {
  address_line: '1200 Dealer Avenue, Miami, FL 33101',
  google_maps_url: 'https://www.google.com/maps/search/?api=1&query=1200%20Dealer%20Avenue%2C%20Miami%2C%20FL%2033101',
};

const DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE = DEFAULT_PUBLIC_LANGUAGE;

const DEFAULT_SITE_CONTENT_SECTIONS = {
  logo: true,
  featured_inventory: true,
  about: true,
  services: true,
  hours: true,
  location: true,
};

const SITE_CONTENT_SOCIAL_LINK_KEYS = DEFAULT_SITE_CONTENT_SOCIAL_LINKS.map((link) => link.key);
const SITE_CONTENT_SECTION_KEYS = Object.keys(DEFAULT_SITE_CONTENT_SECTIONS);

function cloneSiteContentHeroConfig(heroConfig = DEFAULT_SITE_CONTENT_HERO_CONFIG) {
  return {
    background_image: heroConfig?.background_image || DEFAULT_SITE_CONTENT_HERO_CONFIG.background_image,
    eyebrow: heroConfig?.eyebrow ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.eyebrow,
    eyebrow_i18n: normalizeLocalizedTextField(heroConfig?.eyebrow_i18n, {
      fallbackValue: heroConfig?.eyebrow ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.eyebrow,
    }),
    title: heroConfig?.title ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.title,
    title_i18n: normalizeLocalizedTextField(heroConfig?.title_i18n, {
      fallbackValue: heroConfig?.title ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.title,
    }),
    description: heroConfig?.description ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.description,
    description_i18n: normalizeLocalizedTextField(heroConfig?.description_i18n, {
      fallbackValue: heroConfig?.description ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.description,
    }),
    primary_cta_label: heroConfig?.primary_cta_label ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.primary_cta_label,
    primary_cta_label_i18n: normalizeLocalizedTextField(heroConfig?.primary_cta_label_i18n, {
      fallbackValue: heroConfig?.primary_cta_label ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.primary_cta_label,
    }),
    secondary_cta_label: heroConfig?.secondary_cta_label ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.secondary_cta_label,
    secondary_cta_label_i18n: normalizeLocalizedTextField(heroConfig?.secondary_cta_label_i18n, {
      fallbackValue: heroConfig?.secondary_cta_label ?? DEFAULT_SITE_CONTENT_HERO_CONFIG.secondary_cta_label,
    }),
  };
}

function cloneSiteContentServices(services = DEFAULT_SITE_CONTENT_SERVICES) {
  return services.map((service, index) => {
    const defaultService = DEFAULT_SITE_CONTENT_SERVICES[index] || DEFAULT_SITE_CONTENT_SERVICES[0];

    return {
      slot: service?.slot ?? defaultService.slot,
      is_active: Boolean(service?.is_active ?? true),
      title: service?.title ?? defaultService.title,
      title_i18n: normalizeLocalizedTextField(service?.title_i18n, {
        fallbackValue: service?.title ?? defaultService.title,
      }),
      description: service?.description ?? defaultService.description,
      description_i18n: normalizeLocalizedTextField(service?.description_i18n, {
        fallbackValue: service?.description ?? defaultService.description,
      }),
    };
  });
}

function cloneSiteContentHours(hours = DEFAULT_SITE_CONTENT_HOURS) {
  return hours.map((day) => ({
    day_key: day.day_key,
    is_closed: Boolean(day.is_closed),
    open_time: day.open_time ?? null,
    close_time: day.close_time ?? null,
  }));
}

function cloneSiteContentSocialLinks(socialLinks = DEFAULT_SITE_CONTENT_SOCIAL_LINKS) {
  const source = Array.isArray(socialLinks) ? socialLinks : [];
  const sourceByKey = new Map(source.map((link) => [link?.key, link]));

  return DEFAULT_SITE_CONTENT_SOCIAL_LINKS.map((defaultLink) => {
    const link = sourceByKey.get(defaultLink.key) || defaultLink;

    return {
      key: defaultLink.key,
      label: defaultLink.label,
      is_active: Boolean(link.is_active),
      url: link.url ?? '',
    };
  });
}

function cloneSiteContentWhatsapp(whatsapp = DEFAULT_SITE_CONTENT_WHATSAPP) {
  return {
    is_active: Boolean(whatsapp?.is_active),
    phone_number: whatsapp?.phone_number ?? '',
    prefilled_message: whatsapp?.prefilled_message ?? '',
  };
}

function cloneSiteContentLocation(location = DEFAULT_SITE_CONTENT_LOCATION) {
  return {
    address_line: location?.address_line ?? '',
    google_maps_url: location?.google_maps_url ?? '',
  };
}

function normalizeSiteContentDefaultPublicLanguage(value = DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE) {
  return normalizePublicLanguage(value);
}

function cloneSiteContentSections(sections = DEFAULT_SITE_CONTENT_SECTIONS) {
  return SITE_CONTENT_SECTION_KEYS.reduce((accumulator, key) => {
    accumulator[key] = Boolean(sections?.[key] ?? DEFAULT_SITE_CONTENT_SECTIONS[key]);
    return accumulator;
  }, {});
}

function buildDefaultSiteContent() {
  return {
    hero_config: cloneSiteContentHeroConfig(),
    about_body: DEFAULT_SITE_CONTENT_ABOUT_BODY,
    about_body_i18n: DEFAULT_SITE_CONTENT_ABOUT_BODY_I18N,
    services: cloneSiteContentServices(),
    footer_summary: DEFAULT_SITE_CONTENT_FOOTER_SUMMARY,
    footer_summary_i18n: DEFAULT_SITE_CONTENT_FOOTER_SUMMARY_I18N,
    hours: cloneSiteContentHours(),
    social_links: cloneSiteContentSocialLinks(),
    whatsapp_config: cloneSiteContentWhatsapp(),
    location_config: cloneSiteContentLocation(),
    default_public_language: normalizeSiteContentDefaultPublicLanguage(),
    sections_config: cloneSiteContentSections(),
    logo_mime_type: null,
    logo_original_name: null,
    logo_path: null,
    logo_updated_at: null,
  };
}

export {
  DEFAULT_SITE_CONTENT_ABOUT_BODY,
  DEFAULT_SITE_CONTENT_ABOUT_BODY_I18N,
  DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE,
  DEFAULT_SITE_CONTENT_FOOTER_SUMMARY,
  DEFAULT_SITE_CONTENT_FOOTER_SUMMARY_I18N,
  DEFAULT_SITE_CONTENT_HERO_CONFIG,
  DEFAULT_SITE_CONTENT_HOURS,
  DEFAULT_SITE_CONTENT_LOCATION,
  DEFAULT_SITE_CONTENT_SECTIONS,
  DEFAULT_SITE_CONTENT_SERVICES,
  DEFAULT_SITE_CONTENT_SOCIAL_LINKS,
  DEFAULT_SITE_CONTENT_WHATSAPP,
  SITE_CONTENT_DAY_KEYS,
  SITE_CONTENT_SECTION_KEYS,
  SITE_CONTENT_SOCIAL_LINK_KEYS,
  SITE_CONTENT_TEXT_LIMITS,
  buildDefaultSiteContent,
  cloneSiteContentHeroConfig,
  cloneSiteContentHours,
  cloneSiteContentLocation,
  normalizeSiteContentDefaultPublicLanguage,
  cloneSiteContentSections,
  cloneSiteContentServices,
  cloneSiteContentSocialLinks,
  cloneSiteContentWhatsapp,
};
