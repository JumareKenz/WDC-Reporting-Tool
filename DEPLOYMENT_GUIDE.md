# Deployment Guide - User Management & SMS Features

This guide walks through deploying the new user management and SMS notification features to production.

## Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Review SMS provider costs and setup account
- [ ] Prepare SMS API credentials
- [ ] Test migration script locally (if possible)
- [ ] Notify team about deployment window

## Step 1: Database Migration

The database migration adds a UNIQUE constraint to prevent duplicate report submissions.

### Option A: Automatic Migration (Recommended)

Run the migration script on the server:

```bash
cd backend
python migrate_add_unique_constraint.py
```

The script will:
1. Check for duplicate reports
2. Remove duplicates (keeping most recent)
3. Add the UNIQUE constraint
4. Verify the constraint was added

### Option B: Manual Migration (PostgreSQL)

If you prefer manual control:

```sql
-- 1. Check for duplicates
SELECT ward_id, report_month, COUNT(*) as count
FROM reports
GROUP BY ward_id, report_month
HAVING COUNT(*) > 1;

-- 2. If duplicates exist, remove them (keeps most recent)
WITH ranked_reports AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY ward_id, report_month
           ORDER BY submitted_at DESC
         ) as rn
  FROM reports
)
DELETE FROM reports
WHERE id IN (
  SELECT id FROM ranked_reports WHERE rn > 1
);

-- 3. Add constraint
ALTER TABLE reports
ADD CONSTRAINT unique_ward_month UNIQUE (ward_id, report_month);

-- 4. Verify
SELECT conname FROM pg_constraint WHERE conname = 'unique_ward_month';
```

### Rollback (if needed)

If issues arise:

```sql
ALTER TABLE reports DROP CONSTRAINT IF EXISTS unique_ward_month;
```

## Step 2: Configure SMS Provider

Choose one SMS provider and set up credentials.

### Africa's Talking (Recommended for Nigeria)

1. Create account: https://africastalking.com
2. Complete KYC verification
3. Purchase SMS credits (minimum ₦1,000)
4. Register sender ID "KADWDC" (approval takes 1-2 days)
5. Get API credentials from dashboard

### Environment Variables

Add to Render/Railway/your hosting platform:

```bash
SMS_ENABLED=true
SMS_PROVIDER=africastalking
AT_USERNAME=your_username
AT_API_KEY=your_api_key
AT_SENDER_ID=KADWDC
```

See `SMS_SETUP.md` for detailed provider setup instructions.

## Step 3: Deploy Backend Changes

### If using Render.com:

1. Push changes to GitHub:
   ```bash
   git push origin main
   ```

2. Render will auto-deploy

3. Monitor deployment logs for errors

4. After deployment, run migration:
   ```bash
   # Use Render shell or SSH
   cd backend
   python migrate_add_unique_constraint.py
   ```

### If using Railway:

1. Push changes to GitHub
2. Railway will auto-deploy
3. Monitor deployment in dashboard
4. Run migration via Railway CLI or shell

## Step 4: Deploy Frontend Changes

### If using Vercel:

1. Push changes to GitHub:
   ```bash
   git push origin main
   ```

2. Vercel will auto-deploy

3. Monitor deployment in Vercel dashboard

4. Test deployment at https://kadwdc.vercel.app

### Manual Build:

```bash
cd frontend
npm install
npm run build
```

## Step 5: Post-Deployment Testing

### Test User Assignment

1. Login as STATE_OFFICIAL
2. Go to User Management
3. Assign a test user with your phone number
4. Leave password blank (to test auto-generation)
5. Verify SMS is received
6. Login with credentials from SMS
7. Verify user can access the platform

### Test Report Submission

1. Login as WDC_SECRETARY
2. Submit a report for current month
3. Try to submit again (should show "Already Submitted")
4. Verify error message is clear

### Test Profile Management

1. Login as any user
2. Go to Settings
3. Update profile (name, phone)
4. Try to update email (ward/LGA users should be blocked)
5. Change password
6. Verify changes work

## Step 6: Monitor Production

### Check Logs

Monitor for errors in:
- Report submission (duplicate errors)
- User assignment (SMS failures)
- Database constraint violations

### Check SMS Usage

- Monitor SMS credits/units in provider dashboard
- Set up low balance alerts
- Track SMS delivery rates

### Database Health

```sql
-- Check for any constraint violations attempts
SELECT COUNT(*) FROM reports;

-- Verify no duplicates exist
SELECT ward_id, report_month, COUNT(*) as count
FROM reports
GROUP BY ward_id, report_month
HAVING COUNT(*) > 1;
```

## Troubleshooting

### Migration Issues

**Error: "constraint already exists"**
- Constraint was already added (safe to ignore)
- Verify with: `SELECT conname FROM pg_constraint WHERE conname = 'unique_ward_month';`

**Error: "duplicate key violates unique constraint"**
- Duplicates still exist in database
- Run duplicate removal SQL again
- Contact support if issue persists

### SMS Issues

**SMS not sending**
- Check SMS_ENABLED is "true"
- Verify API credentials are correct
- Check provider dashboard for errors
- See SMS_SETUP.md for detailed troubleshooting

**SMS received but formatting wrong**
- Check message template in sms.py
- Verify all placeholders are filled
- Test with different phones

### User Assignment Issues

**Phone number validation error**
- Must be Nigerian format (+234... or 0...)
- Remove spaces and special characters
- System will normalize automatically

**Email already exists**
- Email must be unique across all users
- Check existing users before assigning
- Use different email or update existing user

## Rollback Plan

If critical issues arise:

### 1. Rollback Backend

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback in Render/Railway dashboard
```

### 2. Rollback Database

```sql
-- Remove constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS unique_ward_month;

-- Restore from backup if needed
psql $DATABASE_URL < backup_file.sql
```

### 3. Disable SMS

```bash
# Set environment variable
SMS_ENABLED=false
```

## Success Criteria

- [ ] Database migration completed successfully
- [ ] No duplicate reports exist
- [ ] SMS sending works for test user
- [ ] Auto-generated passwords work
- [ ] Manual passwords still work
- [ ] Duplicate report submission is blocked
- [ ] Error messages are clear
- [ ] All existing features still work
- [ ] No errors in production logs

## Support Contacts

- **Database Issues**: Your database administrator
- **SMS Provider**: See SMS_SETUP.md
- **Hosting Platform**: Render/Railway/Vercel support

## Post-Deployment Communication

Send to all users:

```
Dear WDC Platform Users,

We have deployed important updates:

1. Enhanced User Management
   - New users receive login credentials via SMS
   - Phone numbers now required for assignments

2. Improved Report Submission
   - One report per ward per month (prevents duplicates)
   - Smart month calculation (days 1-7 vs 8-31)
   - Better error messages

3. Profile Management
   - Users can update their own profiles
   - Self-service password changes

If you experience any issues, please contact support.

Thank you,
Kaduna State WDC Team
```

## Maintenance Notes

- **SMS Credits**: Monitor monthly, refill as needed
- **Database Backups**: Daily automated backups recommended
- **Log Monitoring**: Check weekly for anomalies
- **Security**: Rotate API keys quarterly
