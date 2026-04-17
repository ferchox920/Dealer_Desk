import System from '../../entities/system.entity.js';
import { createHttpError } from '../../utils/errors/app-error.util.js';
import { normalizeSlug } from '../../utils/normalizers/string-normalizer.util.js';

class SystemService {
  async getAll() {
    return await System.findAll();
  }

  async getById(id) {
    const system = await System.findByPk(id);

    if (!system) {
      throw createHttpError(404, 'System not found.', 'SYSTEM_NOT_FOUND');
    }

    return system;
  }

  async create(data) {
    const slug = normalizeSlug(data.slug);

    if (!slug) {
      throw createHttpError(400, 'The slug is required.', 'SYSTEM_SLUG_REQUIRED');
    }

    const existingSystem = await System.findOneBySlug(slug);

    if (existingSystem) {
      throw createHttpError(409, 'The slug is already in use.', 'SYSTEM_SLUG_ALREADY_EXISTS');
    }

    return await System.create({
      ...data,
      slug,
      default_subdomain: data.default_subdomain ?? slug,
      status: data.status ?? 'draft',
    });
  }
}

export default new SystemService();
