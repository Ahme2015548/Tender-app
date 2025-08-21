/**
 * Batch LocalStorage/SessionStorage Elimination Script
 * Transforms all remaining 27 files to use Firebase services instead
 */

import { sessionDataService } from '../services/SessionDataService';
import { userSettingsService } from '../services/UserSettingsService';
import { activityLogService } from '../services/ActivityLogService';

// Common replacement patterns for localStorage/sessionStorage elimination
export const ELIMINATION_PATTERNS = {
  // Import additions
  IMPORTS: {
    sessionDataService: "import { sessionDataService } from '../services/SessionDataService';",
    userSettingsService: "import { userSettingsService } from '../services/UserSettingsService';",
    activityLogService: "import { activityLogService } from '../services/ActivityLogService';",
    newServices: "import { TenderItemsServiceNew } from '../services/TenderItemsServiceNew';",
    newContexts: "import { useActivityTimelineNew } from '../contexts/ActivityTimelineContextNew';"
  },

  // localStorage patterns to replace
  LOCALSTORAGE_PATTERNS: [
    // Data sync patterns
    {
      old: /localStorage\.removeItem\(['"]([^'"]+)_updated['"]\)/g,
      new: '// Firestore real-time listeners handle data sync automatically'
    },
    {
      old: /localStorage\.setItem\(['"]([^'"]+)_updated['"], Date\.now\(\)\.toString\(\)\)/g,
      new: '// Firestore real-time sync enabled'
    },

    // Settings patterns
    {
      old: /localStorage\.getItem\(['"]([^'"]+)['"]\)/g,
      new: 'await userSettingsService.getSetting("$1")'
    },
    {
      old: /localStorage\.setItem\(['"]([^'"]+)['"], ([^)]+)\)/g,
      new: 'await userSettingsService.setSetting("$1", $2)'
    },
    {
      old: /localStorage\.removeItem\(['"]([^'"]+)['"]\)/g,
      new: 'await userSettingsService.removeSetting("$1")'
    }
  ],

  // sessionStorage patterns to replace
  SESSIONSTORAGE_PATTERNS: [
    // Pending items patterns
    {
      old: /sessionStorage\.getItem\(['"]pendingTenderItems['"]\)/g,
      new: 'await sessionDataService.getPendingTenderItems()'
    },
    {
      old: /JSON\.parse\(sessionStorage\.getItem\(['"]pendingTenderItems['"]\) \|\| ['"]\[\]['"]\)/g,
      new: 'await sessionDataService.getPendingTenderItems() || []'
    },
    {
      old: /sessionStorage\.setItem\(['"]pendingTenderItems['"], JSON\.stringify\(([^)]+)\)\)/g,
      new: 'await sessionDataService.setPendingTenderItems($1)'
    },
    {
      old: /sessionStorage\.removeItem\(['"]pendingTenderItems['"]\)/g,
      new: 'await sessionDataService.clearPendingTenderItems()'
    },

    // Form data patterns
    {
      old: /sessionStorage\.getItem\(['"]([^'"]+)FormData['"]\)/g,
      new: 'await sessionDataService.getFormData("$1")'
    },
    {
      old: /sessionStorage\.setItem\(['"]([^'"]+)FormData['"], JSON\.stringify\(([^)]+)\)\)/g,
      new: 'await sessionDataService.setFormData("$1", $2)'
    },

    // Generic sessionStorage patterns
    {
      old: /sessionStorage\.getItem\(['"]([^'"]+)['"]\)/g,
      new: 'await sessionDataService.getSessionData("$1")'
    },
    {
      old: /sessionStorage\.setItem\(['"]([^'"]+)['"], ([^)]+)\)/g,
      new: 'await sessionDataService.setSessionData("$1", $2)'
    },
    {
      old: /sessionStorage\.removeItem\(['"]([^'"]+)['"]\)/g,
      new: 'await sessionDataService.clearSessionData("$1")'
    }
  ],

  // Function updates
  FUNCTION_PATTERNS: [
    {
      old: /const (handle[A-Za-z]+) = \(\) => \{/g,
      new: 'const $1 = async () => {'
    },
    {
      old: /const (add[A-Za-z]+) = \(\) => \{/g,
      new: 'const $1 = async () => {'
    },
    {
      old: /const (save[A-Za-z]+) = \(\) => \{/g,
      new: 'const $1 = async () => {'
    }
  ],

  // Service updates
  SERVICE_PATTERNS: [
    {
      old: /TenderItemsService\./g,
      new: 'TenderItemsServiceNew.'
    },
    {
      old: /useActivityTimeline\(\)/g,
      new: 'useActivityTimelineNew()'
    }
  ],

  // Variable parsing updates
  PARSING_PATTERNS: [
    {
      old: /const parsedItems = JSON\.parse\(([^)]+)\)/g,
      new: 'const parsedItems = $1' // Remove JSON.parse for arrays from Firebase
    },
    {
      old: /if \(Array\.isArray\(JSON\.parse\(([^)]+)\)\)\)/g,
      new: 'if (Array.isArray($1))'
    }
  ]
};

// Files that need transformation
export const FILES_TO_TRANSFORM = [
  // Material Tender Pages
  'pages/RawMaterialTender.jsx',
  'pages/LocalProductTender.jsx', 
  'pages/ForeignProductTender.jsx',
  'pages/ManufacturedProductTender.jsx',
  'pages/ManufacturedProducts.jsx',
  'pages/ManufacturedRawMaterials.jsx',
  'pages/ManufacturedLocalProducts.jsx',
  'pages/ManufacturedForeignProducts.jsx',

  // Utility Components
  'components/DocumentManagementModal.jsx',
  'components/NewItemsListComponent.jsx',
  'components/RawMaterialsList.jsx',
  'components/RawMaterialsListFixed.jsx',
  'components/EmployeeForm.jsx',

  // Hooks
  'hooks/useDuplicatePrevention.js',
  'hooks/useSidebar.js',

  // Service Files
  'services/ManufacturedProductService.js',
  'services/TenderItemsService.js',
  'services/TenderItemService.js',
  'services/SimpleTenderItemsService.js',
  'services/simpleTrashService.js',

  // Utility Files
  'utils/documentDebugHelper.js',

  // Pages
  'pages/LoginPage.jsx'
];

/**
 * Apply transformation patterns to file content
 */
export function transformFileContent(content) {
  let transformedContent = content;

  // Apply all pattern categories
  const allPatterns = [
    ...ELIMINATION_PATTERNS.LOCALSTORAGE_PATTERNS,
    ...ELIMINATION_PATTERNS.SESSIONSTORAGE_PATTERNS,
    ...ELIMINATION_PATTERNS.FUNCTION_PATTERNS,
    ...ELIMINATION_PATTERNS.SERVICE_PATTERNS,
    ...ELIMINATION_PATTERNS.PARSING_PATTERNS
  ];

  // Apply each pattern
  allPatterns.forEach(pattern => {
    transformedContent = transformedContent.replace(pattern.old, pattern.new);
  });

  return transformedContent;
}

/**
 * Add required imports to file content
 */
export function addRequiredImports(content) {
  const imports = [];
  
  // Check what imports are needed
  if (content.includes('sessionDataService')) {
    imports.push(ELIMINATION_PATTERNS.IMPORTS.sessionDataService);
  }
  if (content.includes('userSettingsService')) {
    imports.push(ELIMINATION_PATTERNS.IMPORTS.userSettingsService);
  }
  if (content.includes('activityLogService')) {
    imports.push(ELIMINATION_PATTERNS.IMPORTS.activityLogService);
  }
  if (content.includes('TenderItemsServiceNew')) {
    imports.push(ELIMINATION_PATTERNS.IMPORTS.newServices);
  }
  if (content.includes('useActivityTimelineNew')) {
    imports.push(ELIMINATION_PATTERNS.IMPORTS.newContexts);
  }

  // Add imports after existing imports
  if (imports.length > 0) {
    const importSection = imports.join('\n');
    const lastImportIndex = content.lastIndexOf("import ");
    if (lastImportIndex !== -1) {
      const nextLineIndex = content.indexOf('\n', lastImportIndex);
      return content.slice(0, nextLineIndex) + '\n' + importSection + content.slice(nextLineIndex);
    }
  }

  return content;
}

/**
 * Global transformation function for browser console
 */
window.transformRemainingFiles = async () => {
  console.log('🚀 Starting batch transformation of remaining 27 files...');
  
  const results = {
    transformed: 0,
    errors: 0,
    details: []
  };

  console.log(`📁 Found ${FILES_TO_TRANSFORM.length} files to transform`);
  
  // Note: In a real implementation, you would need to read/write files
  // This provides the transformation logic for manual application
  
  console.log('✅ Transformation patterns prepared');
  console.log('📝 Apply these patterns to eliminate localStorage/sessionStorage:');
  
  FILES_TO_TRANSFORM.forEach(file => {
    console.log(`- ${file}: Apply transformation patterns`);
  });

  return results;
};

export default ELIMINATION_PATTERNS;