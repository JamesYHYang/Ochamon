# STEP 3 QA Test Results

## Test Environment
- **Date**: [Execute and fill in date]
- **API URL**: http://localhost:3001
- **Web URL**: http://localhost:3000
- **Database**: PostgreSQL via Docker

## Prerequisites
```bash
# Start database
docker compose up -d

# Install dependencies & generate Prisma client
pnpm install
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Start dev servers
pnpm dev
```

---

## Test 1: Create Product with 2 SKUs, Each with 2 Price Tiers

### Test Credentials
```
Email: seller@kyoto-matcha.com
Password: Seller123!
```

### API Test (cURL)

```bash
# 1. Login to get token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@kyoto-matcha.com",
    "password": "Seller123!"
  }'

# Expected: { "access_token": "...", "refresh_token": "..." }
# Save the access_token for subsequent requests
```

```bash
# 2. Get regions (to get valid regionId)
curl -X GET http://localhost:3001/seller/regions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Note a region ID (e.g., for "Uji, Kyoto")
```

```bash
# 3. Get grade types (to get valid gradeTypeId)
curl -X GET http://localhost:3001/seller/grade-types \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Note a grade type ID (e.g., for "Ceremonial")
```

```bash
# 4. Create product with 2 SKUs, each with 2 price tiers
curl -X POST http://localhost:3001/seller/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QA Test Premium Matcha",
    "description": "A product created for QA testing with multiple SKUs and price tiers",
    "shortDesc": "QA Test Product",
    "leadTimeDays": 7,
    "moqKg": 5,
    "certifications": ["JAS", "USDA Organic"],
    "status": "DRAFT",
    "regionId": "REGION_ID_HERE",
    "gradeTypeId": "GRADE_TYPE_ID_HERE",
    "skus": [
      {
        "sku": "QA-SKU-001",
        "name": "30g Tin",
        "packagingType": "tin",
        "netWeightG": 30,
        "originCountry": "JP",
        "currency": "USD",
        "priceTiers": [
          { "minQty": 1, "maxQty": 9, "pricePerUnit": 25.00 },
          { "minQty": 10, "maxQty": 50, "pricePerUnit": 22.00 }
        ],
        "inventory": {
          "availableQty": 100,
          "unit": "unit",
          "warehouseLocation": "Warehouse A"
        }
      },
      {
        "sku": "QA-SKU-002",
        "name": "100g Pouch",
        "packagingType": "pouch",
        "netWeightG": 100,
        "originCountry": "JP",
        "currency": "USD",
        "priceTiers": [
          { "minQty": 1, "maxQty": 4, "pricePerUnit": 65.00 },
          { "minQty": 5, "maxQty": 20, "pricePerUnit": 58.00 }
        ],
        "inventory": {
          "availableQty": 50,
          "unit": "unit",
          "warehouseLocation": "Warehouse B"
        }
      }
    ]
  }'
```

### Expected Response
```json
{
  "id": "...",
  "name": "QA Test Premium Matcha",
  "slug": "qa-test-premium-matcha",
  "status": "DRAFT",
  "skus": [
    {
      "id": "...",
      "sku": "QA-SKU-001",
      "name": "30g Tin",
      "priceTiers": [
        { "minQty": 1, "maxQty": 9, "pricePerUnit": 25 },
        { "minQty": 10, "maxQty": 50, "pricePerUnit": 22 }
      ],
      "inventory": { "availableQty": 100 }
    },
    {
      "id": "...",
      "sku": "QA-SKU-002",
      "name": "100g Pouch",
      "priceTiers": [
        { "minQty": 1, "maxQty": 4, "pricePerUnit": 65 },
        { "minQty": 5, "maxQty": 20, "pricePerUnit": 58 }
      ],
      "inventory": { "availableQty": 50 }
    }
  ]
}
```

### Test Result
- [ ] **PASS** - Product created with 2 SKUs, each having 2 price tiers
- [ ] **FAIL** - Reason: ___________

---

## Test 2: RBAC Blocks Buyer/Admin from Seller Endpoints

### Test 2a: Buyer Access Denied

```bash
# 1. Login as buyer
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@urbantea.com",
    "password": "Buyer123!"
  }'

# Save the buyer's access_token
```

```bash
# 2. Attempt to access seller profile (should fail)
curl -X GET http://localhost:3001/seller/profile \
  -H "Authorization: Bearer BUYER_ACCESS_TOKEN"

# Expected: 403 Forbidden
```

```bash
# 3. Attempt to create product (should fail)
curl -X POST http://localhost:3001/seller/products \
  -H "Authorization: Bearer BUYER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Product",
    "moqKg": 1,
    "regionId": "any",
    "gradeTypeId": "any"
  }'

# Expected: 403 Forbidden
```

### Expected Response (Both requests)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

### Test Result - Buyer Blocked
- [ ] **PASS** - Buyer receives 403 on all seller endpoints
- [ ] **FAIL** - Reason: ___________

---

### Test 2b: Admin Access Denied

```bash
# 1. Login as admin
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@matcha-trade.com",
    "password": "Admin123!"
  }'

# Save the admin's access_token
```

```bash
# 2. Attempt to access seller products (should fail)
curl -X GET http://localhost:3001/seller/products \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"

# Expected: 403 Forbidden
```

### Test Result - Admin Blocked
- [ ] **PASS** - Admin receives 403 on seller endpoints
- [ ] **FAIL** - Reason: ___________

---

## Test 3: Seller Cannot Edit Another Seller's Products

### Setup
This test requires two seller accounts and at least one product owned by each.

```bash
# 1. Login as Seller 1 (Kyoto Matcha)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@kyoto-matcha.com",
    "password": "Seller123!"
  }'

# Save as SELLER1_TOKEN
```

```bash
# 2. Get Seller 1's products
curl -X GET http://localhost:3001/seller/products \
  -H "Authorization: Bearer SELLER1_TOKEN"

# Note a product ID owned by Seller 1
```

```bash
# 3. Login as Seller 2 (Nishio Green)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@nishio-green.com",
    "password": "Seller123!"
  }'

# Save as SELLER2_TOKEN
```

```bash
# 4. Seller 2 attempts to view Seller 1's product
curl -X GET http://localhost:3001/seller/products/SELLER1_PRODUCT_ID \
  -H "Authorization: Bearer SELLER2_TOKEN"

# Expected: 403 Forbidden - "You do not own this product"
```

```bash
# 5. Seller 2 attempts to update Seller 1's product
curl -X PUT http://localhost:3001/seller/products/SELLER1_PRODUCT_ID \
  -H "Authorization: Bearer SELLER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hacked Product Name"
  }'

# Expected: 403 Forbidden - "You do not own this product"
```

```bash
# 6. Seller 2 attempts to delete Seller 1's product
curl -X DELETE http://localhost:3001/seller/products/SELLER1_PRODUCT_ID \
  -H "Authorization: Bearer SELLER2_TOKEN"

# Expected: 403 Forbidden - "You do not own this product"
```

### Expected Response (All cross-seller requests)
```json
{
  "statusCode": 403,
  "message": "You do not own this product",
  "error": "Forbidden"
}
```

### Test Result - Cross-Seller Protection
- [ ] **PASS** - Seller 2 receives 403 when accessing Seller 1's products
- [ ] **FAIL** - Reason: ___________

---

## Test 4: Zod Validation Error Format

### Test Invalid Product Creation
```bash
curl -X POST http://localhost:3001/seller/products \
  -H "Authorization: Bearer SELLER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "X",
    "moqKg": -5,
    "regionId": "",
    "gradeTypeId": ""
  }'

# Expected: 400 Bad Request with structured validation errors
```

### Expected Response
```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Product name must be at least 2 characters", "code": "too_small" },
    { "field": "moqKg", "message": "MOQ must be positive", "code": "too_small" },
    { "field": "regionId", "message": "Region is required", "code": "too_small" },
    { "field": "gradeTypeId", "message": "Grade type is required", "code": "too_small" }
  ],
  "statusCode": 400
}
```

### Test Result - Zod Validation
- [ ] **PASS** - Validation errors returned in expected format
- [ ] **FAIL** - Reason: ___________

---

## Summary

| Test | Description | Status |
|------|-------------|--------|
| 1 | Create product with 2 SKUs, 2 price tiers each | ⬜ |
| 2a | RBAC blocks buyer from seller endpoints | ⬜ |
| 2b | RBAC blocks admin from seller endpoints | ⬜ |
| 3 | Seller cannot edit another seller's products | ⬜ |
| 4 | Zod validation returns proper error format | ⬜ |

**Overall Status**: ⬜ Pending / ✅ All Pass / ❌ Has Failures

---

## Notes
- Replace `YOUR_ACCESS_TOKEN`, `BUYER_ACCESS_TOKEN`, `ADMIN_ACCESS_TOKEN`, `SELLER1_TOKEN`, `SELLER2_TOKEN` with actual JWT tokens from login responses
- Replace `REGION_ID_HERE`, `GRADE_TYPE_ID_HERE`, `SELLER1_PRODUCT_ID` with actual IDs from your database
- All tests assume the database has been seeded with `pnpm db:seed`

## Tester Sign-off
- **Tested By**: ___________
- **Date**: ___________
- **Environment**: Development / Staging / Production
