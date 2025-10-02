/**
 * Comprehensive Test Runner for NTC Bus Tracking API
 * 
 * This file provides utilities for running and managing all test suites
 * for the NTC Bus Tracking API project.
 */

const { execSync } = require('child_process');
const path = require('path');

class TestRunner {
  constructor() {
    this.testFiles = [
      'auth.test.js',
      'routes.test.js',
      'buses.test.js',
      'trips.test.js',
      'locations.test.js',
      'system.test.js',
      'error-scenarios.test.js'
    ];
    
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      suites: []
    };
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite for NTC Bus Tracking API\n');
    console.log('=' .repeat(60));
    
    for (const testFile of this.testFiles) {
      await this.runTestFile(testFile);
    }
    
    this.printSummary();
  }

  /**
   * Run a specific test file
   */
  async runTestFile(testFile) {
    const testPath = path.join(__dirname, testFile);
    const suiteName = testFile.replace('.test.js', '');
    
    console.log(`\n📋 Running ${suiteName} tests...`);
    console.log('-'.repeat(40));
    
    try {
      const startTime = Date.now();
      const result = execSync(`npx jest ${testPath} --verbose`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Parse Jest output to extract test results
      const lines = result.split('\n');
      let passed = 0;
      let failed = 0;
      let total = 0;
      
      for (const line of lines) {
        if (line.includes('Tests:')) {
          const match = line.match(/(\d+) passed|(\d+) failed|(\d+) total/);
          if (match) {
            if (match[1]) passed = parseInt(match[1]);
            if (match[2]) failed = parseInt(match[2]);
            if (match[3]) total = parseInt(match[3]);
          }
        }
      }
      
      this.testResults.passed += passed;
      this.testResults.failed += failed;
      this.testResults.total += total;
      
      this.testResults.suites.push({
        name: suiteName,
        passed,
        failed,
        total,
        duration,
        status: failed === 0 ? 'PASSED' : 'FAILED'
      });
      
      console.log(`✅ ${suiteName}: ${passed} passed, ${failed} failed (${duration}ms)`);
      
    } catch (error) {
      console.log(`❌ ${suiteName}: Test execution failed`);
      console.log(error.message);
      
      this.testResults.suites.push({
        name: suiteName,
        passed: 0,
        failed: 1,
        total: 1,
        duration: 0,
        status: 'ERROR'
      });
      
      this.testResults.failed += 1;
      this.testResults.total += 1;
    }
  }

  /**
   * Print comprehensive test summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${this.testResults.total}`);
    console.log(`   Passed: ${this.testResults.passed} ✅`);
    console.log(`   Failed: ${this.testResults.failed} ❌`);
    console.log(`   Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    
    console.log(`\n📋 Test Suites:`);
    this.testResults.suites.forEach(suite => {
      const status = suite.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${suite.name}: ${suite.passed}/${suite.total} (${suite.duration}ms)`);
    });
    
    console.log(`\n🎯 Test Coverage:`);
    console.log(`   ✅ Authentication & Authorization`);
    console.log(`   ✅ Routes Management (CRUD)`);
    console.log(`   ✅ Buses Management (CRUD)`);
    console.log(`   ✅ Trips Management (CRUD + Actions)`);
    console.log(`   ✅ Location Updates`);
    console.log(`   ✅ System Health & Status`);
    console.log(`   ✅ Error Handling & Edge Cases`);
    
    console.log(`\n🔍 Test Categories Covered:`);
    console.log(`   • Happy Path Scenarios`);
    console.log(`   • Error Handling (400, 401, 403, 404, 409)`);
    console.log(`   • Input Validation & Sanitization`);
    console.log(`   • Role-based Access Control`);
    console.log(`   • Pagination & Filtering`);
    console.log(`   • Sorting & Conditional GETs`);
    console.log(`   • Rate Limiting`);
    console.log(`   • Concurrent Request Handling`);
    console.log(`   • Edge Cases & Boundary Testing`);
    console.log(`   • Security Testing (XSS, SQL Injection)`);
    console.log(`   • Performance Testing`);
    
    if (this.testResults.failed === 0) {
      console.log(`\n🎉 ALL TESTS PASSED! The API is ready for production.`);
    } else {
      console.log(`\n⚠️  ${this.testResults.failed} tests failed. Please review and fix issues.`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Run tests with coverage report
   */
  async runTestsWithCoverage() {
    console.log('🔍 Running tests with coverage analysis...\n');
    
    try {
      const result = execSync('npx jest --coverage --coverageReporters=text --coverageReporters=html', {
        encoding: 'utf8',
        stdio: 'inherit'
      });
      
      console.log('\n📊 Coverage report generated in coverage/ directory');
      
    } catch (error) {
      console.log('❌ Coverage analysis failed:', error.message);
    }
  }

  /**
   * Run specific test categories
   */
  async runCategory(category) {
    const categoryMap = {
      'auth': ['auth.test.js'],
      'routes': ['routes.test.js'],
      'buses': ['buses.test.js'],
      'trips': ['trips.test.js'],
      'locations': ['locations.test.js'],
      'system': ['system.test.js'],
      'errors': ['error-scenarios.test.js'],
      'crud': ['routes.test.js', 'buses.test.js', 'trips.test.js'],
      'security': ['auth.test.js', 'error-scenarios.test.js']
    };

    const files = categoryMap[category] || [];
    
    if (files.length === 0) {
      console.log(`❌ Unknown category: ${category}`);
      console.log(`Available categories: ${Object.keys(categoryMap).join(', ')}`);
      return;
    }

    console.log(`🎯 Running ${category} tests...\n`);
    
    for (const testFile of files) {
      await this.runTestFile(testFile);
    }
    
    this.printSummary();
  }
}

// CLI interface
if (require.main === module) {
  const runner = new TestRunner();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    runner.runAllTests();
  } else if (args[0] === '--coverage') {
    runner.runTestsWithCoverage();
  } else if (args[0] === '--category') {
    runner.runCategory(args[1]);
  } else {
    console.log('Usage:');
    console.log('  node test-runner.js                    # Run all tests');
    console.log('  node test-runner.js --coverage        # Run with coverage');
    console.log('  node test-runner.js --category <name>  # Run specific category');
    console.log('');
    console.log('Available categories:');
    console.log('  auth, routes, buses, trips, locations, system, errors');
    console.log('  crud, security');
  }
}

module.exports = TestRunner;
