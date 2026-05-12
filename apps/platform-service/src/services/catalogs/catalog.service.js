import PlatformAddon from '../../entities/addon.entity.js';
import PlatformCurrency from '../../entities/currency.entity.js';
import PlatformLocation from '../../entities/location.entity.js';
import PlatformPlan from '../../entities/plan.entity.js';

class PlatformCatalogService {
  async getLocations() {
    return await PlatformLocation.findAll({ is_active: true });
  }

  async getCurrencies() {
    return await PlatformCurrency.findAll({ is_active: true });
  }

  async getPlans() {
    return await PlatformPlan.findAll({
      is_active: true,
      includeDetails: true,
    });
  }

  async getAddons() {
    return await PlatformAddon.findAll({ is_active: true });
  }
}

export default new PlatformCatalogService();
