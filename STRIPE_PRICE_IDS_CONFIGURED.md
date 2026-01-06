# Stripe Price IDs Configuration Complete - December 26, 2025

## ✅ All Price IDs Configured in SSM Parameter Store

### Subscription Plans
- **Pro Individual**: `price_1SHbdABfddQoErBPxNggWV4y` ($9.99/month)
  - SSM: `/storytailor-production/stripe/pro-individual-price-id`
  - Product: `prod_TE3k9XzvFALmMl` (Storytailor Consumer)
  - Nickname: "Alexa Starter Monthly"

- **Pro Organization**: `price_1Rek2aBfddQoErBPNAGi8GdI` ($25.00/month per seat)
  - SSM: `/storytailor-production/stripe/pro-organization-price-id`
  - Product: `prod_RfNTV96j8Re9tF` (Organization)
  - Description: "Monthly pricing for organizations."

### Story Packs (One-Time Purchases)
- **5-Pack**: `price_1SHbdEBfddQoErBPmcWD1kLI` ($4.99)
  - SSM: `/storytailor-production/stripe/story-pack-5-price-id`
  - Product: `prod_TE3kYpRCvwSfCg` (Story Packs)
  - Nickname: "5 Story Pack"

- **10-Pack**: `price_1SHbdEBfddQoErBP0b0zLmVa` ($8.99)
  - SSM: `/storytailor-production/stripe/story-pack-10-price-id`
  - Product: `prod_TE3kYpRCvwSfCg` (Story Packs)
  - Nickname: "10 Story Pack"

- **25-Pack**: `price_1SipHoBfddQoErBPvRX8PWBQ` ($19.99) ⭐ **NEWLY CREATED**
  - SSM: `/storytailor-production/stripe/story-pack-25-price-id`
  - Product: `prod_TE3kYpRCvwSfCg` (Story Packs)
  - Created: December 26, 2025
  - Note: Created new price since we had 20-pack but needed 25-pack

### Gift Cards (One-Time Purchases)
- **1-Month**: `price_1P5ZPDBfddQoErBP9xqve5xC` ($14.99)
  - SSM: `/storytailor-production/stripe/gift-card-1-month-price-id`
  - Product: `prod_PvQFyzIM0iYkrR` (Storytailor Digital Gift Card)

- **3-Month**: `price_1P5ZPcBfddQoErBP56visjuq` ($38.00)
  - SSM: `/storytailor-production/stripe/gift-card-3-month-price-id`
  - Product: `prod_PvQFyzIM0iYkrR` (Storytailor Digital Gift Card)

- **6-Month**: `price_1P5ZPtBfddQoErBPYgKS8AQH` ($70.00)
  - SSM: `/storytailor-production/stripe/gift-card-6-month-price-id`
  - Product: `prod_PvQFyzIM0iYkrR` (Storytailor Digital Gift Card)

- **12-Month**: `price_1P5ZQABfddQoErBP3cqsZq1Z` ($120.00)
  - SSM: `/storytailor-production/stripe/gift-card-12-month-price-id`
  - Product: `prod_PvQFyzIM0iYkrR` (Storytailor Digital Gift Card)

## Deployment Script Updates

✅ **Updated**: `scripts/deploy-universal-agent-proper.sh`
- Added loading of all 9 Stripe price IDs from SSM Parameter Store
- Added all price IDs to Lambda environment variables (3 locations):
  1. `create-function` with S3 upload
  2. `create-function` with zip file
  3. `update-function-configuration`

## Verification

All price IDs have been:
1. ✅ Verified in Stripe (checked existing products/prices)
2. ✅ Created missing 25-pack price
3. ✅ Configured in SSM Parameter Store
4. ✅ Added to deployment script

## Next Steps

1. **Deploy Universal Agent** to pick up new environment variables:
   ```bash
   ./scripts/deploy-universal-agent-proper.sh production
   ```

2. **Test Checkout Endpoints**:
   - `POST /api/v1/checkout/individual`
   - `POST /api/v1/story-packs/buy`
   - `POST /api/v1/gift-cards/purchase`

3. **Verify** all checkout endpoints work correctly

## Notes

- All prices are in **USD** (cents)
- All prices are **active** in Stripe
- 25-pack was created new (we had 20-pack but needed 25-pack)
- Gift card prices match expected monthly subscription values:
  - 1-month: $14.99 (≈ $9.99/month + processing)
  - 3-month: $38.00 (≈ $12.67/month)
  - 6-month: $70.00 (≈ $11.67/month)
  - 12-month: $120.00 (≈ $10.00/month)

