import desktopHeroSource from '../assets/desktop-home-desk.webp';
export { default as classicHero } from '../../public/illustrations/hero-laptop-service-grid.svg?url';

// Shared by the rendered image and its view-selected preload so only one candidate downloads.
export const desktopHeroOptions = {
  src: desktopHeroSource,
  width: 1800,
  height: 600,
  widths: [480, 800, 1200, 1600, 1800],
  sizes: '100vw',
  format: 'webp' as const,
  quality: 80,
};

export const mobileHeroOptions = {
  ...desktopHeroOptions,
  width: 800,
  height: 267,
  widths: [320, 480, 640, 800],
  sizes: '(min-width: 768px) 680px, calc(100vw - 64px)',
};
