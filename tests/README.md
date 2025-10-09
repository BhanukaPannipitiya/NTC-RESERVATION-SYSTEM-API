# NTC Bus Tracking API - Comprehensive Test Suite

This directory contains a complete test suite for the NTC Bus Tracking API, covering all endpoints, error scenarios, edge cases, and security aspects.

## 📋 Test Files Overview

### Core API Tests
- **`auth.test.js`** - Authentication & Authorization endpoints
- **`routes.test.js`** - Routes management (CRUD operations)
- **`buses.test.js`** - Buses management (CRUD operations)
- **`trips.test.js`** - Trips management (CRUD + actions)
- **`locations.test.js`** - Location updates for running trips
- **`system.test.js`** - System health and status endpoints

### Advanced Testing
- **`error-scenarios.test.js`** - Error handling, validation, edge cases
- **`test-runner.js`** - Comprehensive test runner with reporting

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run comprehensive test suite with detailed reporting
npm run test:all

# Run tests with coverage
npm run test:coverage
```

### Individual Test Suites
```bash
# Authentication tests
npm run test:auth

# Routes management tests
npm run test:routes

# Buses management tests
npm run test:buses

# Trips management tests
npm run test:trips

# Location updates tests
npm run test:locations

# System health tests
npm run test:system

# Error scenarios tests
npm run test:errors
```

### Category-based Testing
```bash
# CRUD operations (routes, buses, trips)
npm run test:crud

# Security tests (auth, error scenarios)
npm run test:security
```

### Advanced Options
```bash
# Watch mode for development
npm run test:watch

# Run specific test file
npx jest tests/auth.test.js

# Run tests matching pattern
npx jest --testNamePattern="should login"

# Run tests with verbose output
npx jest --verbose
```

## 📊 Test Coverage

### Endpoints Covered
- ✅ **Authentication**: Login, Register, Profile, Change Password, User Management
- ✅ **Routes**: GET, POST, PUT, DELETE with pagination, filtering, sorting
- ✅ **Buses**: GET, POST, PUT, DELETE with role-based access
- ✅ **Trips**: GET, POST, PUT, DELETE, Start, Complete, Running trips
- ✅ **Locations**: POST location updates for running trips
- ✅ **System**: Health check, Status monitoring

### Test Categories
- ✅ **Happy Path Scenarios** - Normal operation flows
- ✅ **Error Handling** - 400, 401, 403, 404, 409 status codes
- ✅ **Input Validation** - Data type validation, required fields
- ✅ **Input Sanitization** - XSS prevention, SQL injection protection
- ✅ **Role-based Access** - NTC, Operator, Commuter permissions
- ✅ **Pagination & Filtering** - Query parameter validation
- ✅ **Sorting** - Field and direction validation
- ✅ **Conditional GETs** - ETag and If-Modified-Since headers
- ✅ **Rate Limiting** - Request frequency limits
- ✅ **Concurrent Requests** - Multiple simultaneous requests
- ✅ **Edge Cases** - Boundary values, extreme inputs
- ✅ **Security Testing** - Authentication, authorization, input validation

## 🔍 Test Scenarios

### Authentication Tests
- Valid/invalid login credentials
- User registration with validation
- Profile management
- Password changes
- Token validation
- Role-based access control
- User statistics (admin only)

### Routes Tests
- CRUD operations with proper authorization
- Pagination with various parameters
- Filtering by status
- Sorting by name, distance, creation date
- Conditional GET requests
- Input validation and sanitization

### Buses Tests
- CRUD operations (NTC admin only)
- Filtering by route ID and status
- Sorting by number, capacity, creation date
- Duplicate number prevention
- Bus-trip relationship validation

### Trips Tests
- CRUD operations with role restrictions
- Trip status management (scheduled, running, completed, cancelled)
- Start/complete trip actions
- Filtering by route, bus, status, date
- Time validation (past/future dates)
- Running trips endpoint

### Locations Tests
- Location updates for running trips only
- GPS coordinate validation (latitude/longitude bounds)
- Operator-only access
- Trip status validation
- Coordinate precision handling

### System Tests
- Health check endpoint
- System status with uptime, memory, database info
- Root endpoint with API information
- Concurrent request handling

### Error Scenarios Tests
- Authentication failures
- Authorization violations
- Input validation errors
- XSS and SQL injection attempts
- Edge cases (large numbers, unicode, special characters)
- Network and connection issues
- Concurrent request handling

## 📈 Test Results

### Expected Output
```
🚀 Starting Comprehensive Test Suite for NTC Bus Tracking API

============================================================

📋 Running auth tests...
----------------------------------------
✅ auth: 45 passed, 0 failed (1250ms)

📋 Running routes tests...
----------------------------------------
✅ routes: 38 passed, 0 failed (980ms)

📋 Running buses tests...
----------------------------------------
✅ buses: 42 passed, 0 failed (1100ms)

📋 Running trips tests...
----------------------------------------
✅ trips: 55 passed, 0 failed (1350ms)

📋 Running locations tests...
----------------------------------------
✅ locations: 28 passed, 0 failed (750ms)

📋 Running system tests...
----------------------------------------
✅ system: 15 passed, 0 failed (400ms)

📋 Running error-scenarios tests...
----------------------------------------
✅ error-scenarios: 35 passed, 0 failed (1200ms)

============================================================
📊 COMPREHENSIVE TEST SUMMARY
============================================================

📈 Overall Results:
   Total Tests: 258
   Passed: 258 ✅
   Failed: 0 ❌
   Success Rate: 100.0%

📋 Test Suites:
   ✅ auth: 45/45 (1250ms)
   ✅ routes: 38/38 (980ms)
   ✅ buses: 42/42 (1100ms)
   ✅ trips: 55/55 (1350ms)
   ✅ locations: 28/28 (750ms)
   ✅ system: 15/15 (400ms)
   ✅ error-scenarios: 35/35 (1200ms)

🎯 Test Coverage:
   ✅ Authentication & Authorization
   ✅ Routes Management (CRUD)
   ✅ Buses Management (CRUD)
   ✅ Trips Management (CRUD + Actions)
   ✅ Location Updates
   ✅ System Health & Status
   ✅ Error Handling & Edge Cases

🎉 ALL TESTS PASSED! The API is ready for production.
============================================================
```

## 🛠️ Test Configuration

### Jest Configuration
Tests use Jest with the following configuration:
- **Environment**: Node.js
- **Test Framework**: Jest + Supertest
- **Coverage**: HTML and text reports
- **Timeout**: 30 seconds per test
- **Setup**: Automatic app initialization

### Test Data
- Uses realistic seed data from `data/simulation.json`
- Creates temporary test data for each test suite
- Cleans up test data after completion
- Supports concurrent test execution

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure port 3000 is available
2. **Database locks**: Tests use separate test database
3. **Authentication failures**: Check seed data and user credentials
4. **Timeout errors**: Increase Jest timeout if needed

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm test

# Run specific test with verbose output
npx jest tests/auth.test.js --verbose

# Run tests in watch mode
npm run test:watch
```

## 📝 Adding New Tests

### Test Structure
```javascript
describe('Feature Name', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test data
  });

  describe('GET /endpoint', () => {
    it('should return expected data', async () => {
      const response = await request(app.app)
        .get('/endpoint')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});
```

### Best Practices
- Use descriptive test names
- Test both success and failure scenarios
- Include edge cases and boundary testing
- Clean up test data after tests
- Use proper assertions
- Test authentication and authorization
- Include input validation tests

## 🎯 Quality Assurance

This comprehensive test suite ensures:
- **Functionality**: All endpoints work as expected
- **Security**: Proper authentication and authorization
- **Reliability**: Error handling and edge cases
- **Performance**: Concurrent request handling
- **Maintainability**: Well-structured and documented tests

The test suite provides confidence that the NTC Bus Tracking API meets production-ready standards and handles all scenarios gracefully.
