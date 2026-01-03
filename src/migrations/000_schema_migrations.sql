-- =====================================================
-- Schema Migrations Table
-- Version: 0.0
-- Created: 2025-12-18
-- Description: Table to track database migrations
-- =====================================================

-- Create schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    name text NOT NULL,
    executed_at timestamptz NOT NULL DEFAULT now(),
    execution_time_ms integer,
    checksum text
);

-- Enable RLS for migrations table (optional, but good practice)
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view/modify migrations
CREATE POLICY "Only admins can view migrations" ON schema_migrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE 
            id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can insert migrations" ON schema_migrations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles WHERE 
            id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON schema_migrations TO authenticated;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at);

-- Comment
COMMENT ON TABLE schema_migrations IS 'Tracks database schema migrations and their execution status';
