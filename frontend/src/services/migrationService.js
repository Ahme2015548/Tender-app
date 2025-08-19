/**
 * Master Migration Service for Internal ID System
 * Coordinates migration across all services
 */

import { RawMaterialService } from './rawMaterialService.js';
import { TenderService } from './TenderService.js';
import { LocalProductService } from './localProductService.js';
import { ForeignProductService } from './foreignProductService.js';
import { SupplierService } from './supplierService.js';
import { ForeignSupplierService } from './foreignSupplierService.js';
import { CustomerService } from './customerService.js';

export class MigrationService {
  
  /**
   * Run all migrations in order of dependency
   * @returns {Object} Migration results
   */
  static async runAllMigrations() {
    console.log('🚀 Starting comprehensive internal ID migration...');
    
    const results = {
      startTime: new Date(),
      migrations: {},
      totalMigrated: 0,
      success: true,
      errors: []
    };

    try {
      // Phase 1: Core entities (no dependencies)
      console.log('\n📦 Phase 1: Core Entities Migration');
      
      results.migrations.rawMaterials = await this.runSafeMigration(
        'Raw Materials',
        () => RawMaterialService.migrateExistingData()
      );
      
      results.migrations.customers = await this.runSafeMigration(
        'Customers',
        () => CustomerService.migrateExistingData()
      );
      
      results.migrations.localSuppliers = await this.runSafeMigration(
        'Local Suppliers',
        () => SupplierService.migrateExistingData()
      );
      
      results.migrations.foreignSuppliers = await this.runSafeMigration(
        'Foreign Suppliers',
        () => ForeignSupplierService.migrateExistingData()
      );

      // Phase 2: Products (depend on suppliers)
      console.log('\n🏭 Phase 2: Products Migration');
      
      results.migrations.localProducts = await this.runSafeMigration(
        'Local Products',
        () => LocalProductService.migrateExistingData()
      );
      
      results.migrations.foreignProducts = await this.runSafeMigration(
        'Foreign Products',
        () => ForeignProductService.migrateExistingData()
      );

      // Phase 3: Complex entities (depend on other entities)
      console.log('\n📋 Phase 3: Complex Entities Migration');
      
      results.migrations.tenders = await this.runSafeMigration(
        'Tenders',
        () => TenderService.migrateExistingData()
      );

      // Calculate totals
      results.totalMigrated = Object.values(results.migrations)
        .reduce((total, migration) => total + (migration.migratedCount || 0), 0);
      
      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;
      
      console.log('\n✅ Migration completed successfully!');
      console.log(`📊 Total entities migrated: ${results.totalMigrated}`);
      console.log(`⏱️ Total time: ${results.duration}ms`);
      
      return results;
      
    } catch (error) {
      results.success = false;
      results.error = error.message;
      results.endTime = new Date();
      
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Run a single migration with error handling
   * @param {string} entityName - Name of the entity being migrated
   * @param {Function} migrationFunction - Migration function to run
   * @returns {Object} Migration result
   */
  static async runSafeMigration(entityName, migrationFunction) {
    try {
      console.log(`  🔄 Migrating ${entityName}...`);
      const startTime = Date.now();
      
      const result = await migrationFunction();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`  ✅ ${entityName}: ${result.migratedCount || 0} entities migrated (${duration}ms)`);
      
      return {
        ...result,
        entityName,
        duration,
        success: true
      };
      
    } catch (error) {
      console.error(`  ❌ ${entityName} migration failed:`, error.message);
      
      return {
        entityName,
        success: false,
        error: error.message,
        migratedCount: 0
      };
    }
  }

  /**
   * Validate all entities have proper internal IDs
   * @returns {Object} Validation results
   */
  static async validateMigration() {
    console.log('🔍 Validating migration results...');
    
    const validation = {
      startTime: new Date(),
      entities: {},
      totalEntities: 0,
      entitiesWithIds: 0,
      success: true,
      errors: []
    };

    try {
      // Validate each entity type
      const validations = [
        { name: 'Raw Materials', service: RawMaterialService, prefix: 'rm_' },
        { name: 'Customers', service: CustomerService, prefix: 'cst_' },
        { name: 'Local Suppliers', service: SupplierService, prefix: 'ls_' },
        { name: 'Foreign Suppliers', service: ForeignSupplierService, prefix: 'fs_' },
        { name: 'Local Products', service: LocalProductService, prefix: 'lp_' },
        { name: 'Foreign Products', service: ForeignProductService, prefix: 'fp_' },
        { name: 'Tenders', service: TenderService, prefix: 'tdr_' }
      ];

      for (const { name, service, prefix } of validations) {
        try {
          const getAllMethod = service.getAllRawMaterials || 
                              service.getAllCustomers || 
                              service.getAllSuppliers || 
                              service.getAllLocalProducts || 
                              service.getAllForeignProducts || 
                              service.getAllTenders;
          
          if (getAllMethod) {
            const entities = await getAllMethod.call(service);
            const withIds = entities.filter(e => e.internalId && e.internalId.startsWith(prefix));
            
            validation.entities[name] = {
              total: entities.length,
              withInternalIds: withIds.length,
              percentage: entities.length > 0 ? (withIds.length / entities.length * 100).toFixed(1) : 100
            };
            
            validation.totalEntities += entities.length;
            validation.entitiesWithIds += withIds.length;
            
            console.log(`  📊 ${name}: ${withIds.length}/${entities.length} (${validation.entities[name].percentage}%)`);
          }
        } catch (error) {
          validation.errors.push(`${name}: ${error.message}`);
          console.error(`  ❌ ${name} validation failed:`, error.message);
        }
      }

      validation.overallPercentage = validation.totalEntities > 0 
        ? (validation.entitiesWithIds / validation.totalEntities * 100).toFixed(1)
        : 100;

      validation.endTime = new Date();
      validation.success = validation.errors.length === 0;

      console.log(`\n✅ Validation completed!`);
      console.log(`📊 Overall: ${validation.entitiesWithIds}/${validation.totalEntities} entities have proper internal IDs (${validation.overallPercentage}%)`);

      return validation;

    } catch (error) {
      validation.success = false;
      validation.error = error.message;
      validation.endTime = new Date();
      
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Run migration and validation together
   * @returns {Object} Complete migration results
   */
  static async runFullMigration() {
    try {
      const migrationResults = await this.runAllMigrations();
      const validationResults = await this.validateMigration();
      
      return {
        migration: migrationResults,
        validation: validationResults,
        success: migrationResults.success && validationResults.success
      };
      
    } catch (error) {
      console.error('❌ Full migration failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status without running migration
   * @returns {Object} Current migration status
   */
  static async getMigrationStatus() {
    console.log('📋 Checking current migration status...');
    return await this.validateMigration();
  }
}

export default MigrationService;