// Senior React: Comprehensive Image Management System
// This handles all image paths for both components and CSS

// Import all images from assets directory for bundling
import logoSvg from '../assets/images/logo.svg';
import logoSmSvg from '../assets/images/logo-sm.svg';
import userPng from '../assets/images/user.png';
import pdfIconPng from '../assets/images/pdf-icon.png';
import menuArrowSvg from '../assets/images/menu-arrow.svg';
import patternJpg from '../assets/images/pattern.jpg';
import pattern2Jpg from '../assets/images/pattern2.jpg';
import pattern3Jpg from '../assets/images/pattern3.jpg';
import pattern4Jpg from '../assets/images/pattern4.jpg';
import curveLineSvg from '../assets/images/curve-line.svg';
import dotsSvg from '../assets/images/dots.svg';

// Senior React: Image path management with fallback strategy
class ImageManager {
  constructor() {
    this.imageCache = new Map();
    this.initializeImages();
  }

  // Initialize all imported images
  initializeImages() {
    this.images = {
      'logo.svg': logoSvg,
      'logo-sm.svg': logoSmSvg,
      'user.png': userPng,
      'pdf-icon.png': pdfIconPng,
      'menu-arrow.svg': menuArrowSvg,
      'pattern.jpg': patternJpg,
      'pattern2.jpg': pattern2Jpg,
      'pattern3.jpg': pattern3Jpg,
      'pattern4.jpg': pattern4Jpg,
      'curve-line.svg': curveLineSvg,
      'dots.svg': dotsSvg
    };
  }

  // Get image path with smart resolution
  getImage(imageName) {
    // Check if we have the bundled version first
    if (this.images[imageName]) {
      return this.images[imageName];
    }

    // Fallback to public directory
    return `/images/${imageName}`;
  }

  // Get all images for CSS injection
  getAllImages() {
    return this.images;
  }

  // Inject CSS custom properties for background images
  injectImageCSS() {
    if (typeof document === 'undefined') return;

    const style = document.createElement('style');
    style.id = 'senior-react-images';
    
    // Remove existing style if present
    const existing = document.getElementById('senior-react-images');
    if (existing) {
      existing.remove();
    }

    const cssRules = [
      `:root {`,
      `  --image-logo: url("${this.getImage('logo.svg')}");`,
      `  --image-logo-sm: url("${this.getImage('logo-sm.svg')}");`,
      `  --image-user: url("${this.getImage('user.png')}");`,
      `  --image-pdf-icon: url("${this.getImage('pdf-icon.png')}");`,
      `  --image-menu-arrow: url("${this.getImage('menu-arrow.svg')}");`,
      `  --image-pattern: url("${this.getImage('pattern.jpg')}");`,
      `  --image-pattern2: url("${this.getImage('pattern2.jpg')}");`,
      `  --image-pattern3: url("${this.getImage('pattern3.jpg')}");`,
      `  --image-pattern4: url("${this.getImage('pattern4.jpg')}");`,
      `  --image-curve-line: url("${this.getImage('curve-line.svg')}");`,
      `  --image-dots: url("${this.getImage('dots.svg')}");`,
      `}`,
      ``,
      `/* Fix main.scss background images */`,
      `.pattern-bg:nth-child(1) { background: var(--image-pattern) !important; }`,
      `.pattern-bg:nth-child(2) { background: var(--image-pattern2) !important; }`,
      `.pattern-bg:nth-child(3) { background: var(--image-pattern3) !important; }`,
      `.pattern-bg:nth-child(4) { background: var(--image-pattern4) !important; }`,
      ``,
      `/* Fix menu arrow in CSS */`,
      `.sidebar-menu > li.active > a::after,`,
      `.menu-arrow::before { background: var(--image-menu-arrow) !important; }`,
      ``,
      `/* Fix curve line */`,
      `.curve-line { background: var(--image-curve-line) repeat-y !important; }`,
      ``,
      `/* Fix dots */`,
      `.dots-bg { background: var(--image-dots) no-repeat !important; }`
    ];

    style.textContent = cssRules.join('\n');
    document.head.appendChild(style);
  }
}

// Create singleton instance
const imageManager = new ImageManager();

// Senior React: Public API
export const getImage = (imageName) => imageManager.getImage(imageName);
export const getAllImages = () => imageManager.getAllImages();
export const injectImageCSS = () => imageManager.injectImageCSS();

// Auto-inject CSS when module loads
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => imageManager.injectImageCSS(), 100);
    });
  } else {
    setTimeout(() => imageManager.injectImageCSS(), 100);
  }
}

export default imageManager;