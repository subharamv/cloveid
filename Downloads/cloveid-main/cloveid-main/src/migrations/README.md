# Database Migrations

This directory contains SQL migration files for the CLOVE ID Maker database schema.

## Migration Files

### 000_schema_migrations.sql
- **Purpose**: Creates the `schema_migrations` table to track migration execution
- **Version**: 0.0
- **Dependencies**: None (must be run first)

### 001_initial_schema.sql
- **Purpose**: Sets up the complete initial database schema
- **Version**: 1.0
- **Dependencies**: 000_schema_migrations.sql

### create_admin_user.sql
- **Purpose**: Creates admin user profile after user is created through Supabase Auth
- **Version**: 1.0
- **Dependencies**: 001_initial_schema.sql
- **Note**: Run this separately after creating user through Supabase Dashboard

### 002_sync_auth_users_to_profiles.sql
- **Purpose**: Syncs existing auth users to profiles table and sets proper roles
- **Version**: 2.0
- **Dependencies**: 001_initial_schema.sql
- **Note**: Run this after initial schema to sync existing users

## Database Schema Overview

### Core Tables

1. **employees**: Stores employee information
   - Basic info: name, employee_id, email, phone, branch
   - Medical info: blood_group, emergency_contact
   - Metadata: created_at, updated_at, created_by, is_active

2. **id_cards**: Stores ID card data and status
   - Links to employees and batches
   - Stores card design data in JSONB format
   - Tracks status through workflow stages

3. **card_batches**: Manages groups of ID cards
   - Tracks batch information and statistics
   - Auto-generates batch IDs (B-00001, B-00002, etc.)
   - Maintains card counts automatically

4. **profiles**: User management and roles
   - Links to Supabase auth.users
   - Role-based access control (user, admin, manager)
   - Branch assignments and contact info

### Enums for Data Consistency

- `blood_group_enum`: A+, A-, B+, B-, AB+, AB-, O+, O-
- `branch_enum`: HYD, VIZAG
- `card_status_enum`: pending, in_editing, awaiting_approval, approved, sent_for_printing, completed, cancelled
- `user_role_enum`: user, admin, manager

### Features

#### Row Level Security (RLS)
- All tables have RLS enabled
- Role-based access policies
- Admins have full access
- Users can manage their own data

#### Performance Optimizations
- Comprehensive indexing strategy
- GIN indexes for JSONB and text search
- Optimized foreign key relationships

#### Business Logic
- Automatic timestamp updates via triggers
- Batch ID generation function
- Card count tracking for batches
- Data validation constraints

#### Views for Common Queries
- `employee_card_details`: Combined employee and card information
- `batch_statistics`: Batch overview with card counts by status

## How to Run Migrations

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run migrations in order:
   ```sql
   -- First: Create migrations tracking table
   -- Paste and run 000_schema_migrations.sql content
   
   -- Second: Run main schema migration
   -- Paste and run 001_initial_schema.sql content
   
   -- Third: Sync existing users (optional)
   -- Paste and run 002_sync_auth_users_to_profiles.sql content
   ```

### Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Run all migrations
supabase db push

# Or run specific files
supabase db reset  # Will run all migrations in order
```

### Using psql (Direct Database Connection)

```bash
# Connect to your database
psql "postgresql://[user]:[password]@[host]:[port]/[database]"

# Run migrations in order
\i src/migrations/000_schema_migrations.sql
\i src/migrations/001_initial_schema.sql
\i src/migrations/002_sync_auth_users_to_profiles.sql  # Optional: for existing users
```

## Post-Migration Setup

### Admin User Creation

The migration system does NOT create admin users automatically. You have two options:

#### Option 1: Create Admin User Manually
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. Click **"Add user"** and create:
   - **Email**: subharam.v@clovetech.com
   - **Password**: Choose a secure password
   - **Auto-confirm email**: Check this box

#### Option 2: Sync Existing Users (Optional)
If you have existing auth users that need profiles:
1. Run the `002_sync_auth_users_to_profiles.sql` migration
2. This will create profile entries for all existing auth users

#### Step 3: Create Admin Profile
After creating the user in Supabase Auth:
1. Go to **SQL Editor** in your Supabase Dashboard
2. Run the `create_admin_user.sql` script
3. This will create the admin profile with:
   - **Role**: admin
   - **Branch**: HYD
   - **Full Name**: Subharam V

**Important**: 
- The `create_admin_user.sql` script will show helpful guidance if the user doesn't exist in Supabase Auth yet
- The `002_sync_auth_users_to_profiles.sql` migration should only be run once, after initial schema setup

### Verification

After running migrations, verify the setup:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public';

-- Verify admin user
SELECT * FROM profiles WHERE role = 'admin';

-- Check sync results
SELECT 
    p.full_name,
    p.role,
    p.branch,
    u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin';
```

## Schema Validation

The migration includes comprehensive validation:

- Email format validation
- Phone number format validation
- Employee ID format validation
- JSONB data structure validation
- Foreign key constraints
- Check constraints for business rules

## Migration Execution Order

### Recommended Order:
1. **000_schema_migrations.sql** - Create migration tracking
2. **001_initial_schema.sql** - Set up database schema
3. **002_sync_auth_users_to_profiles.sql** - Sync existing users (optional)
4. **create_admin_user.sql** - Set up admin user (manual)

### Future Migrations

When creating new migrations:

1. Use sequential numbering: 003_migration_name.sql, 004_migration_name.sql, etc.
2. Always include version header and description
3. Use proper transaction handling
4. Update the schema_migrations table to track execution
5. Test thoroughly before applying to production

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you're running migrations as a database superuser or with appropriate privileges
2. **RLS Policy Conflicts**: Check that policies don't block your access
3. **Foreign Key Errors**: Ensure referenced tables exist before creating constraints
4. **Extension Not Available**: Some PostgreSQL extensions might need to be enabled by Supabase support
5. **User Sync Issues**: If `002_sync_auth_users_to_profiles.sql` fails, check auth.users table exists first

### Rollback Strategy

For development, you can reset the database:

```sql
-- Drop all tables (development only!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Re-run migrations from the beginning
```

For production, create specific rollback scripts for each migration.

## Security Considerations

- Admin credentials should be changed immediately after first login
- Review RLS policies match your security requirements
- Regular user access should be limited to necessary operations only
- Consider implementing additional audit logging if needed
- Use separate admin user creation workflow for security
