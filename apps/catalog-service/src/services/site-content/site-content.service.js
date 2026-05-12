import SiteContent from '../../entities/site-content.entity.js';
import cloudinary from '../../config/cloudinary/cloudinary.js';
import {
  DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE,
  DEFAULT_SITE_CONTENT_HERO_CONFIG,
  SITE_CONTENT_DAY_KEYS,
  buildDefaultSiteContent,
  cloneSiteContentHeroConfig,
  cloneSiteContentHours,
  cloneSiteContentLocation,
  cloneSiteContentSections,
  cloneSiteContentServices,
  cloneSiteContentSocialLinks,
  cloneSiteContentWhatsapp,
  normalizeSiteContentDefaultPublicLanguage,
} from '../../constants/site-content.js';
import { DEFAULT_PUBLIC_LANGUAGE, normalizePublicLanguage } from '../../constants/public-i18n.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import {
  buildLegacyLocalizedTextField,
  getLocalizedTextSourceValue,
  normalizeLocalizedTextField,
  resolveLocalizedText,
} from '../../utils/i18n/public-text.util.js';
import { trimBoundaryWhitespace } from '../../utils/normalizers/string-normalizer.util.js';
import {
  buildWhatsappContactUrl,
  isWhatsappPhoneNumberNormalizedValid,
  normalizeWhatsappPhoneNumber,
  trimWhatsappMessage,
} from '../../utils/normalizers/whatsapp.util.js';
import {
  buildGoogleMapsEmbedUrl,
  normalizeSiteLocationConfig,
} from '../../utils/normalizers/site-location.util.js';
import { collectSiteContentValidationErrors } from '../../utils/validations/site-content/site-content.validation.js';
import { destroyCloudinaryAssetsBestEffort } from '../../utils/cloudinary/destroy-cloudinary-assets.util.js';
import { resolveSystemFolderName } from '../../utils/cloudinary/cloudinary-folder.util.js';

function normalizeSimpleText(value) {
  return trimBoundaryWhitespace(value);
}

function buildSiteLogoFolder() {
  return `dealer_desk/${resolveSystemFolderName({})}/site-content`;
}

function buildSiteLogoPublicUrl(publicId, updatedAt) {
  if (!publicId) {
    return null;
  }

  const version = updatedAt ? Math.floor(new Date(updatedAt).getTime() / 1000) : undefined;
  return cloudinary.url(publicId, {
    secure: true,
    version,
  });
}

function normalizeIncomingLocalizedField(field, fallbackValue) {
  return normalizeLocalizedTextField(field, { fallbackValue });
}

function mergeLocalizedField(currentField, incomingField, fallbackValue = '') {
  const normalizedCurrentField = normalizeIncomingLocalizedField(currentField, fallbackValue);

  if (incomingField === undefined) {
    return normalizedCurrentField;
  }

  const sourceValues = incomingField?.values && typeof incomingField.values === 'object'
    ? incomingField.values
    : incomingField;

  return normalizeIncomingLocalizedField({
    en: typeof sourceValues?.en === 'string' ? sourceValues.en : normalizedCurrentField.en,
    es: typeof sourceValues?.es === 'string' ? sourceValues.es : normalizedCurrentField.es,
  }, fallbackValue);
}

function normalizeHeroConfig(heroConfig, currentHeroConfig = null) {
  const source = cloneSiteContentHeroConfig(heroConfig);
  const fixedHeroDefaults = cloneSiteContentHeroConfig(DEFAULT_SITE_CONTENT_HERO_CONFIG);

  return {
    background_image: source.background_image,
    eyebrow_i18n: normalizeIncomingLocalizedField(
      source.eyebrow_i18n,
      source.eyebrow || currentHeroConfig?.eyebrow || '',
    ),
    get eyebrow() {
      return normalizeSimpleText(getLocalizedTextSourceValue(this.eyebrow_i18n, source.eyebrow));
    },
    title_i18n: normalizeIncomingLocalizedField(
      source.title_i18n,
      source.title || currentHeroConfig?.title || '',
    ),
    get title() {
      return normalizeSimpleText(getLocalizedTextSourceValue(this.title_i18n, source.title));
    },
    description_i18n: normalizeIncomingLocalizedField(
      source.description_i18n,
      source.description || currentHeroConfig?.description || '',
    ),
    get description() {
      return normalizeSimpleText(getLocalizedTextSourceValue(this.description_i18n, source.description));
    },
    primary_cta_label: fixedHeroDefaults.primary_cta_label,
    primary_cta_label_i18n: fixedHeroDefaults.primary_cta_label_i18n,
    secondary_cta_label: fixedHeroDefaults.secondary_cta_label,
    secondary_cta_label_i18n: fixedHeroDefaults.secondary_cta_label_i18n,
  };
}

function normalizeAboutBody(field, currentContent = null) {
  const localizedText = normalizeIncomingLocalizedField(field, currentContent?.about_body || '');

  return {
    about_body: normalizeSimpleText(getLocalizedTextSourceValue(localizedText, currentContent?.about_body || '')),
    about_body_i18n: localizedText,
  };
}

async function normalizeServices(services) {
  const normalizedServices = cloneSiteContentServices(services).sort((left, right) => left.slot - right.slot);

  return await Promise.all(normalizedServices.map(async (service, index) => ({
    slot: index + 1,
    is_active: Boolean(service.is_active),
    title_i18n: normalizeIncomingLocalizedField(service.title_i18n, service.title),
    get title() {
      return normalizeSimpleText(getLocalizedTextSourceValue(this.title_i18n, service.title));
    },
    description_i18n: normalizeIncomingLocalizedField(service.description_i18n, service.description),
    get description() {
      return normalizeSimpleText(getLocalizedTextSourceValue(this.description_i18n, service.description));
    },
  })));
}

function normalizeFooterSummary(field, currentContent = null) {
  const localizedText = normalizeIncomingLocalizedField(field, currentContent?.footer_summary || '');

  return {
    footer_summary: normalizeSimpleText(getLocalizedTextSourceValue(localizedText, currentContent?.footer_summary || '')),
    footer_summary_i18n: localizedText,
  };
}

function normalizeHours(hours) {
  const source = new Map(cloneSiteContentHours(hours).map((day) => [day.day_key, day]));

  return SITE_CONTENT_DAY_KEYS.map((dayKey) => {
    const day = source.get(dayKey);

    return {
      day_key: dayKey,
      is_closed: Boolean(day?.is_closed),
      open_time: day?.is_closed ? null : day?.open_time ?? null,
      close_time: day?.is_closed ? null : day?.close_time ?? null,
    };
  });
}

function normalizeSocialLinks(socialLinks) {
  return cloneSiteContentSocialLinks(socialLinks).map((link) => ({
    key: link.key,
    label: link.label,
    is_active: Boolean(link.is_active),
    url: normalizeSimpleText(link.url || ''),
  }));
}

function normalizeWhatsappConfig(whatsapp) {
  const source = cloneSiteContentWhatsapp(whatsapp);
  const normalizedPrefilledMessage = trimWhatsappMessage(source.prefilled_message)
    .replace(/\{\{\s*product_code\s*\}\}/gi, '{{product_name}}')
    .replace(/this listing\.\s*Code:\s*/i, 'this listing: ');

  return {
    is_active: Boolean(source.is_active),
    phone_number: normalizeWhatsappPhoneNumber(source.phone_number),
    prefilled_message: normalizedPrefilledMessage,
  };
}

function buildWhatsappResponse(whatsapp, options = {}) {
  const normalizedWhatsapp = normalizeWhatsappConfig(whatsapp);
  const hasValidPhoneNumber = isWhatsappPhoneNumberNormalizedValid(normalizedWhatsapp.phone_number);
  const canRenderPublicButton = normalizedWhatsapp.is_active && hasValidPhoneNumber;
  const contactUrl = canRenderPublicButton
    ? buildWhatsappContactUrl(normalizedWhatsapp.phone_number, normalizedWhatsapp.prefilled_message)
    : null;

  if (options.audience === 'public') {
    return {
      is_active: canRenderPublicButton,
      phone_number: canRenderPublicButton ? normalizedWhatsapp.phone_number : '',
      prefilled_message: canRenderPublicButton ? normalizedWhatsapp.prefilled_message : '',
      contact_url: contactUrl,
    };
  }

  return {
    is_active: normalizedWhatsapp.is_active,
    phone_number: normalizedWhatsapp.phone_number,
    prefilled_message: normalizedWhatsapp.prefilled_message,
    contact_url: contactUrl,
  };
}

function buildLocationResponse(location) {
  const normalizedLocation = normalizeSiteLocationConfig(cloneSiteContentLocation(location));

  return {
    address_line: normalizedLocation.address_line,
    google_maps_url: normalizedLocation.google_maps_url,
    embed_url: buildGoogleMapsEmbedUrl(normalizedLocation.address_line),
  };
}

function normalizeSectionsConfig(sections) {
  return cloneSiteContentSections(sections);
}

function mergeHeroPatch(currentHeroConfig, heroPatch = {}) {
  const currentHero = cloneSiteContentHeroConfig(currentHeroConfig);

  return {
    background_image: heroPatch.background_image ?? currentHero.background_image,
    eyebrow: currentHero.eyebrow,
    eyebrow_i18n: mergeLocalizedField(currentHero.eyebrow_i18n, heroPatch.eyebrow_i18n, currentHero.eyebrow),
    title: currentHero.title,
    title_i18n: mergeLocalizedField(currentHero.title_i18n, heroPatch.title_i18n, currentHero.title),
    description: currentHero.description,
    description_i18n: mergeLocalizedField(currentHero.description_i18n, heroPatch.description_i18n, currentHero.description),
    primary_cta_label: currentHero.primary_cta_label,
    primary_cta_label_i18n: currentHero.primary_cta_label_i18n,
    secondary_cta_label: currentHero.secondary_cta_label,
    secondary_cta_label_i18n: currentHero.secondary_cta_label_i18n,
  };
}

function mergeServicesPatch(currentServices, servicesPatch = []) {
  if (!Array.isArray(servicesPatch) || servicesPatch.length === 0) {
    return cloneSiteContentServices(currentServices);
  }

  const currentServicesBySlot = new Map(cloneSiteContentServices(currentServices).map((service) => [service.slot, service]));

  return cloneSiteContentServices(currentServices).map((service) => {
    const patch = servicesPatch.find((candidate) => Number(candidate?.slot) === Number(service.slot));

    if (!patch) {
      return service;
    }

    const currentService = currentServicesBySlot.get(service.slot) || service;

    return {
      ...currentService,
      is_active: patch.is_active ?? currentService.is_active,
      title_i18n: mergeLocalizedField(currentService.title_i18n, patch.title_i18n, currentService.title),
      description_i18n: mergeLocalizedField(currentService.description_i18n, patch.description_i18n, currentService.description),
    };
  });
}

function mergeHoursPatch(currentHours, hoursPatch = []) {
  if (!Array.isArray(hoursPatch) || hoursPatch.length === 0) {
    return cloneSiteContentHours(currentHours);
  }

  const currentHoursByDayKey = new Map(cloneSiteContentHours(currentHours).map((day) => [day.day_key, day]));

  return SITE_CONTENT_DAY_KEYS.map((dayKey) => {
    const currentDay = currentHoursByDayKey.get(dayKey) || {
      day_key: dayKey,
      is_closed: false,
      open_time: null,
      close_time: null,
    };
    const patch = hoursPatch.find((candidate) => candidate?.day_key === dayKey);

    if (!patch) {
      return currentDay;
    }

    return {
      day_key: dayKey,
      is_closed: patch.is_closed ?? currentDay.is_closed,
      open_time: patch.is_closed === true ? null : patch.open_time ?? currentDay.open_time,
      close_time: patch.is_closed === true ? null : patch.close_time ?? currentDay.close_time,
    };
  });
}

function mergeSocialLinksPatch(currentSocialLinks, socialLinksPatch = []) {
  if (!Array.isArray(socialLinksPatch) || socialLinksPatch.length === 0) {
    return cloneSiteContentSocialLinks(currentSocialLinks);
  }

  const currentLinksByKey = new Map(cloneSiteContentSocialLinks(currentSocialLinks).map((link) => [link.key, link]));

  return cloneSiteContentSocialLinks(currentSocialLinks).map((link) => {
    const patch = socialLinksPatch.find((candidate) => candidate?.key === link.key);

    if (!patch) {
      return link;
    }

    const currentLink = currentLinksByKey.get(link.key) || link;

    return {
      ...currentLink,
      is_active: patch.is_active ?? currentLink.is_active,
      url: patch.url ?? currentLink.url,
    };
  });
}

function mergeWhatsappPatch(currentWhatsapp, whatsappPatch = {}) {
  const currentWhatsappConfig = cloneSiteContentWhatsapp(currentWhatsapp);

  return {
    is_active: whatsappPatch.is_active ?? currentWhatsappConfig.is_active,
    phone_number: whatsappPatch.phone_number ?? currentWhatsappConfig.phone_number,
    prefilled_message: whatsappPatch.prefilled_message ?? currentWhatsappConfig.prefilled_message,
  };
}

function mergeLocationPatch(currentLocation, locationPatch = {}) {
  const currentLocationConfig = cloneSiteContentLocation(currentLocation);

  return {
    address_line: locationPatch.address_line ?? currentLocationConfig.address_line,
    google_maps_url: locationPatch.google_maps_url ?? currentLocationConfig.google_maps_url,
  };
}

function mergeSectionsPatch(currentSections, sectionsPatch = {}) {
  return {
    ...cloneSiteContentSections(currentSections),
    ...Object.fromEntries(Object.entries(sectionsPatch || {}).filter(([, value]) => typeof value === 'boolean')),
  };
}

function buildMergedEditableContent(currentContent, patch) {
  return {
    hero: mergeHeroPatch(currentContent.hero_config, patch.hero),
    about_body: patch.about_body ?? currentContent.about_body,
    about_body_i18n: mergeLocalizedField(currentContent.about_body_i18n, patch.about_body_i18n, currentContent.about_body),
    services: mergeServicesPatch(currentContent.services, patch.services),
    footer_summary: patch.footer_summary ?? currentContent.footer_summary,
    footer_summary_i18n: mergeLocalizedField(currentContent.footer_summary_i18n, patch.footer_summary_i18n, currentContent.footer_summary),
    hours: mergeHoursPatch(currentContent.hours, patch.hours),
    social_links: mergeSocialLinksPatch(currentContent.social_links, patch.social_links),
    whatsapp: mergeWhatsappPatch(currentContent.whatsapp_config, patch.whatsapp),
    location: mergeLocationPatch(currentContent.location_config, patch.location),
    sections: mergeSectionsPatch(currentContent.sections_config, patch.sections),
  };
}

function serializeHeroConfig(heroConfig, language, audience) {
  const normalizedHeroConfig = cloneSiteContentHeroConfig(heroConfig);
  const effectiveLanguage = normalizePublicLanguage(language);

  if (audience === 'public') {
    return {
      background_image: normalizedHeroConfig.background_image,
      eyebrow: resolveLocalizedText(normalizedHeroConfig.eyebrow_i18n, effectiveLanguage, normalizedHeroConfig.eyebrow),
      title: resolveLocalizedText(normalizedHeroConfig.title_i18n, effectiveLanguage, normalizedHeroConfig.title),
      description: resolveLocalizedText(normalizedHeroConfig.description_i18n, effectiveLanguage, normalizedHeroConfig.description),
    };
  }

  return normalizedHeroConfig;
}

function serializeServices(services, language, audience) {
  const normalizedServices = cloneSiteContentServices(services);
  const effectiveLanguage = normalizePublicLanguage(language);

  if (audience === 'public') {
    return normalizedServices.map((service) => ({
      slot: service.slot,
      is_active: Boolean(service.is_active),
      title: resolveLocalizedText(service.title_i18n, effectiveLanguage, service.title),
      description: resolveLocalizedText(service.description_i18n, effectiveLanguage, service.description),
    }));
  }

  return normalizedServices;
}

function serializeSiteContent(content, options = {}) {
  const hasLogo = Boolean(content.logo_path);
  const normalizedSections = normalizeSectionsConfig(content.sections_config);
  const isPublicAudience = options.audience === 'public';
  const effectiveLanguage = normalizePublicLanguage(options.language || DEFAULT_PUBLIC_LANGUAGE);
  const canRenderLogo = hasLogo && (!isPublicAudience || normalizedSections.logo);

  return {
    hero: serializeHeroConfig(content.hero_config, effectiveLanguage, options.audience),
    about_body: isPublicAudience
      ? resolveLocalizedText(content.about_body_i18n, effectiveLanguage, normalizeSimpleText(content.about_body))
      : normalizeSimpleText(content.about_body),
    about_body_i18n: isPublicAudience
      ? undefined
      : normalizeLocalizedTextField(content.about_body_i18n, { fallbackValue: content.about_body }),
    footer_summary: isPublicAudience
      ? resolveLocalizedText(content.footer_summary_i18n, effectiveLanguage, normalizeSimpleText(content.footer_summary))
      : normalizeSimpleText(content.footer_summary),
    footer_summary_i18n: isPublicAudience
      ? undefined
      : normalizeLocalizedTextField(content.footer_summary_i18n, { fallbackValue: content.footer_summary }),
    has_logo: hasLogo,
    services: serializeServices(content.services, effectiveLanguage, options.audience),
    hours: normalizeHours(content.hours),
    social_links: normalizeSocialLinks(content.social_links),
    whatsapp: buildWhatsappResponse(content.whatsapp_config, options),
    location: buildLocationResponse(content.location_config),
    default_public_language: normalizeSiteContentDefaultPublicLanguage(
      content.default_public_language || DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE,
    ),
    sections: normalizedSections,
    logo_original_name: content.logo_original_name ?? null,
    logo_updated_at: content.logo_updated_at ?? null,
    logo_url: canRenderLogo ? buildSiteLogoPublicUrl(content.logo_path, content.logo_updated_at) : null,
  };
}

function ensureLegacyI18nContent(content) {
  return {
    ...content,
    hero_config: cloneSiteContentHeroConfig(content.hero_config),
    about_body_i18n: normalizeLocalizedTextField(content.about_body_i18n, { fallbackValue: content.about_body }),
    footer_summary_i18n: normalizeLocalizedTextField(content.footer_summary_i18n, { fallbackValue: content.footer_summary }),
    services: cloneSiteContentServices(content.services).map((service) => ({
      ...service,
      title_i18n: normalizeLocalizedTextField(service.title_i18n, { fallbackValue: service.title }),
      description_i18n: normalizeLocalizedTextField(service.description_i18n, { fallbackValue: service.description }),
    })),
  };
}

class SiteContentService {
  async ensureCurrent() {
    const currentContent = await SiteContent.getCurrent();

    if (currentContent) {
      return ensureLegacyI18nContent(currentContent);
    }

    return await SiteContent.upsert(buildDefaultSiteContent());
  }

  async get() {
    const currentContent = await this.ensureCurrent();
    return serializeSiteContent(currentContent, { language: DEFAULT_PUBLIC_LANGUAGE });
  }

  async getPublic(language) {
    const currentContent = await this.ensureCurrent();
    return serializeSiteContent(currentContent, {
      audience: 'public',
      language,
    });
  }

  async update(data) {
    const currentContent = await this.ensureCurrent();
    const mergedContent = buildMergedEditableContent(currentContent, data || {});
    const validationErrors = collectSiteContentValidationErrors(mergedContent);

    if (validationErrors.length > 0) {
      const error = createHttpError(400, 'The site content payload is invalid.', 'SITE_CONTENT_INVALID');
      error.errors = validationErrors;
      throw error;
    }

    const heroConfig = normalizeHeroConfig(mergedContent.hero, currentContent.hero_config);
    const aboutContent = normalizeAboutBody(mergedContent.about_body_i18n, {
      ...currentContent,
      about_body: mergedContent.about_body,
    });
    const footerSummary = normalizeFooterSummary(mergedContent.footer_summary_i18n, {
      ...currentContent,
      footer_summary: mergedContent.footer_summary,
    });
    const services = await normalizeServices(mergedContent.services);

    const savedContent = await SiteContent.upsert({
      hero_config: heroConfig,
      about_body: aboutContent.about_body,
      about_body_i18n: aboutContent.about_body_i18n,
      services,
      footer_summary: footerSummary.footer_summary,
      footer_summary_i18n: footerSummary.footer_summary_i18n,
      hours: normalizeHours(mergedContent.hours),
      social_links: normalizeSocialLinks(mergedContent.social_links),
      whatsapp_config: normalizeWhatsappConfig(mergedContent.whatsapp),
      location_config: normalizeSiteLocationConfig(mergedContent.location),
      default_public_language: normalizeSiteContentDefaultPublicLanguage(
        currentContent.default_public_language || DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE,
      ),
      sections_config: normalizeSectionsConfig(mergedContent.sections),
      logo_path: currentContent.logo_path ?? null,
      logo_mime_type: currentContent.logo_mime_type ?? null,
      logo_original_name: currentContent.logo_original_name ?? null,
      logo_updated_at: currentContent.logo_updated_at ?? null,
    });

    return serializeSiteContent(savedContent, { language: DEFAULT_PUBLIC_LANGUAGE });
  }

  async uploadLogo(file) {
    if (!file) {
      throw createHttpError(400, 'A logo image is required.', 'SITE_LOGO_REQUIRED');
    }

    const currentContent = await this.ensureCurrent();

    if (currentContent.logo_path) {
      throw createHttpError(
        409,
        'You already have a logo. Delete the current one before uploading another.',
        'SITE_LOGO_ALREADY_EXISTS',
      );
    }

    const uploadResult = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        folder: buildSiteLogoFolder(),
      },
    );

    try {
      const savedContent = await SiteContent.upsert({
        hero_config: currentContent.hero_config,
        about_body: currentContent.about_body,
        about_body_i18n: currentContent.about_body_i18n || buildLegacyLocalizedTextField(currentContent.about_body),
        services: currentContent.services,
        footer_summary: currentContent.footer_summary,
        footer_summary_i18n: currentContent.footer_summary_i18n || buildLegacyLocalizedTextField(currentContent.footer_summary),
        hours: currentContent.hours,
        social_links: currentContent.social_links,
        whatsapp_config: currentContent.whatsapp_config,
        location_config: currentContent.location_config,
        default_public_language: normalizeSiteContentDefaultPublicLanguage(
          currentContent.default_public_language || DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE,
        ),
        sections_config: currentContent.sections_config,
        logo_path: uploadResult.public_id,
        logo_mime_type: file.mimetype,
        logo_original_name: file.originalname,
        logo_updated_at: new Date(),
      });

      return serializeSiteContent(savedContent, { language: DEFAULT_PUBLIC_LANGUAGE });
    } catch (error) {
      await destroyCloudinaryAssetsBestEffort([uploadResult.public_id], 'site logo');
      throw error;
    }
  }

  async deleteLogo() {
    const currentContent = await this.ensureCurrent();

    if (!currentContent.logo_path) {
      throw createHttpError(404, 'There is no logo to delete.', 'SITE_LOGO_NOT_FOUND');
    }

    const logoPublicId = currentContent.logo_path;

    const savedContent = await SiteContent.upsert({
      hero_config: currentContent.hero_config,
      about_body: currentContent.about_body,
      about_body_i18n: currentContent.about_body_i18n || buildLegacyLocalizedTextField(currentContent.about_body),
      services: currentContent.services,
      footer_summary: currentContent.footer_summary,
      footer_summary_i18n: currentContent.footer_summary_i18n || buildLegacyLocalizedTextField(currentContent.footer_summary),
      hours: currentContent.hours,
      social_links: currentContent.social_links,
      whatsapp_config: currentContent.whatsapp_config,
      location_config: currentContent.location_config,
      default_public_language: normalizeSiteContentDefaultPublicLanguage(
        currentContent.default_public_language || DEFAULT_SITE_CONTENT_DEFAULT_PUBLIC_LANGUAGE,
      ),
      sections_config: currentContent.sections_config,
      logo_path: null,
      logo_mime_type: null,
      logo_original_name: null,
      logo_updated_at: null,
    });

    await destroyCloudinaryAssetsBestEffort([logoPublicId], 'site logo');

    return serializeSiteContent(savedContent, { language: DEFAULT_PUBLIC_LANGUAGE });
  }
}

export default new SiteContentService();
