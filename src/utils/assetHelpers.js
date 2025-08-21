// Import images from assets directory
import logoSvg from '../assets/images/logo.svg';
import logoSmSvg from '../assets/images/logo-sm.svg';
import userPng from '../assets/images/user.png';
import pdfIconPng from '../assets/images/pdf-icon.png';
import menuArrowSvg from '../assets/images/menu-arrow.svg';

// Asset paths using ES6 imports - Vite will process and bundle these
export const ASSETS = {
  logo: () => logoSvg,
  logoSm: () => logoSmSvg,
  user: () => userPng,
  pdfIcon: () => pdfIconPng,
  menuArrow: () => menuArrowSvg,
};