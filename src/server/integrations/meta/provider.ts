import type { MetaProvider } from "./types";
import { getPages } from "./pages";
import { getForms } from "./forms";
import { getLeadById, getLeadsForForm } from "./leads";
import { getCampaigns, getAds } from "./campaigns";

/**
 * The real, production Meta Graph API implementation of MetaProvider (spec
 * §45). This is the only implementation used at runtime; services depend on
 * the MetaProvider interface (not this concrete object) so a mock
 * implementing the same interface can be substituted in tests.
 */
export const metaProvider: MetaProvider = {
  getPages,
  getForms,
  getLeads: getLeadsForForm,
  getLeadById,
  getCampaigns,
  getAds,
};
