# Database Migration: Fix recorded_sessions.course_id Type Mismatch

## Issue
The `recorded_sessions.course_id` field is defined as UUID, but the `courses.id` field is INTEGER. This causes recordings to fail with the error:
```
invalid input syntax for type uuid: "1"
```

## Solution
Run the migration to change `recorded_sessions.course_id` from UUID to INTEGER to match the courses table.

## How to Run Migration

### Option 1: Using Node.js Script (Recommended)
```bash
cd educators-edge-backend
node run-migration.js
```

### Option 2: Direct SQL (if you have database access)
```bash
# Connect to your database and run:
psql -d your_database_url -f migrations/fix_recorded_sessions_course_id.sql
```

### Option 3: Through Database GUI
Copy and paste the contents of `migrations/fix_recorded_sessions_course_id.sql` into your database administration tool (pgAdmin, etc.) and execute.

## What This Migration Does

1. **Drops existing constraints** (if any) on course_id
2. **Converts course_id** from UUID to INTEGER type
3. **Adds foreign key constraint** linking to courses.id
4. **Updates column comments** for documentation

## Before Running Migration

⚠️ **Important**: This migration will attempt to preserve existing data, but:
- If you have recorded_sessions with course_id values that cannot be converted to integers, those records will have NULL course_id
- Consider backing up your database first
- Test in a development environment if possible

## After Migration

Once the migration is complete:
- ✅ Live session recordings will work properly
- ✅ Course selection will save with correct integer course IDs
- ✅ Student recordings will be properly filtered by course

## Verification

After running the migration, you can verify it worked by:

1. **Check the column type**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'recorded_sessions' AND column_name = 'course_id';
   ```
   Should return: `INTEGER`

2. **Try starting a recording** - it should now work without UUID errors

## Rollback (if needed)

If you need to rollback this migration, you would run:
```sql
ALTER TABLE recorded_sessions ALTER COLUMN course_id TYPE UUID USING gen_random_uuid();
```
⚠️ **Warning**: This will generate new random UUIDs and break the relationship to courses!