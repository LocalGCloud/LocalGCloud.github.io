import desktopHeroSource from '../assets/desktop-home-desk.webp';
export { default as classicHero } from '../../public/illustrations/hero-laptop-service-grid.svg?url';

// Shared by the rendered image and its view-selected preload so only one candidate downloads.
export const desktopHeroOptions = {
  src: desktopHeroSource,
  width: 1800,
  height: 600,
  widths: [480, 800, 1200, 1600, 1800],
  sizes: '(min-width: 1425px) 800px, 56.16vw',
  format: 'webp' as const,
  quality: 80,
};
