# Stripe Price ID Mapping - December 26, 2025

## Analysis of Existing Stripe Products & Prices

### ✅ Found Products

1. **Storytailor Consumer** (`prod_TE3k9XzvFALmMl`)
   - Description: "Therapeutic storytelling subscriptions"
   - Prices:
     - `price_1SHbdABfddQoErBPxNggWV4y` - $9.99/month (999 cents) - **Pro Individual** ✅
     - `price_1SHbdBBfddQoErBPy9TB7eaR` - $12.99/month (1299 cents)
     - `price_1SHbdCBfddQoErBPHSDHdU9l` - $19.99/month (1999 cents)
     - `price_1SHbdDBfddQoErBPyAsOpst0` - $24.99/month (2499 cents)

2. **Story Packs** (`prod_TE3kYpRCvwSfCg`)
   - Description: "One-time story credit packs"
   - Prices:
     - `price_1SHbdEBfddQoErBPmcWD1kLI` - $4.99 (499 cents) - **5-pack** ✅
     - `price_1SHbdEBfddQoErBP0b0zLmVa` - $8.99 (899 cents) - **10-pack** ✅
     - `price_1SHbdEBfddQoErBPDYSwOQIz` - $14.99 (1499 cents) - **20-pack** (need 25-pack!)

3. **Storytailor Digital Gift Card** (`prod_PvQFyzIM0iYkrR`)
   - Description: "After your purchase is finalized, you'll receive an email confirming the gift has been sent..."
   - Prices:
     - `price_1P5ZPDBfddQoErBP9xqve5xC` - $14.99 (1499 cents) - **1-month** ✅
     - `price_1P5ZPcBfddQoErBP56visjuq` - $38.00 (3800 cents) - **3-month** ✅
     - `price_1P5ZPtBfddQoErBPYgKS8AQH` - $70.00 (7000 cents) - **6-month** ✅
     - `price_1P5ZQABfddQoErBP3cqsZq1Z` - $120.00 (12000 cents) - **12-month** ✅

4. **Organization** (`prod_RfNTV96j8Re9tF`)
   - Description: null
   - Need to check prices for Pro Organization

## Required Price IDs

### Subscriptions
- ✅ **Pro Individual**: `price_1SHbdABfddQoErBPxNggWV4y` ($9.99/month)
- ⏳ **Pro Organization**: Need to identify from Organization product

### Story Packs
- ✅ **5-pack**: `price_1SHbdEBfddQoErBPmcWD1kLI` ($4.99)
- ✅ **10-pack**: `price_1SHbdEBfddQoErBP0b0zLmVa` ($8.99)
- ⚠️ **25-pack**: Need to create (we have 20-pack but need 25-pack)

### Gift Cards
- ✅ **1-month**: `price_1P5ZPDBfddQoErBP9xqve5xC` ($14.99)
- ✅ **3-month**: `price_1P5ZPcBfddQoErBP56visjuq` ($38.00)
- ✅ **6-month**: `price_1P5ZPtBfddQoErBPYgKS8AQH` ($70.00)
- ✅ **12-month**: `price_1P5ZQABfddQoErBP3cqsZq1Z` ($120.00)

## Next Steps

1. Check Organization product prices for Pro Organization
2. Create 25-pack price if needed
3. Configure all price IDs in SSM Parameter Store

