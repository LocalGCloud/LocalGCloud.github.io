import { expectedSearchRoutes, siteOrigin } from './searchRoutes';

export const searchIntents = expectedSearchRoutes.map((route) => ({
  ...route,
  canonicalUrl: new URL(route.path, siteOrigin).toString(),
}));
