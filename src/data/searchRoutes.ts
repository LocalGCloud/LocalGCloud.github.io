import { expectedSearchRoutes, siteOrigin } from '../../scripts/search-routes.mjs';

export { expectedSearchRoutes, siteOrigin };

export type SearchRoute = (typeof expectedSearchRoutes)[number];
