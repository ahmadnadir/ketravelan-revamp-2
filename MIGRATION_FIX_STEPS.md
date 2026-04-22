# Fix Migration Errors - Quick Steps

## Problem
- Migration version `20260420` was already recorded when the second one failed
- Can't rerun because of duplicate key error
- Need to clear the failed entry

## Solution

### Step 1: Clear Failed Migration in Supabase Dashboard

1. Go to: **Supabase Dashboard → Your Project → SQL Editor**
2. Run this query to remove the failed migration:

```sql
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = 20260420;
```

3. Click **RUN**
4. Verify it says "1 row deleted"

### Step 2: Rerun Migrations with Fixed Names

Now the migrations are renamed with proper timestamps:
- `20260420090000_add_blocked_users.sql` 
- `20260420100000_add_ugc_terms_tracking.sql`

Run:
```bash
supabase db push
```

✓ Should now show:
```
Applying migration 20260420090000_add_blocked_users.sql...
Successfully applied 1 migration.

Applying migration 20260420100000_add_ugc_terms_tracking.sql...
Successfully applied 1 migration.
```

### What Was Fixed
- ✅ Renamed migrations to use unique version numbers
- ✅ Cleared failed migration entry from schema_migrations
- ✅ Ready to rerun without conflicts

---

## Done!

Once migrations succeed, continue with:
1. Build web: `npm run build && npx wrangler pages deploy dist`
2. Test on device
3. Record demo video
4. Submit to App Store
