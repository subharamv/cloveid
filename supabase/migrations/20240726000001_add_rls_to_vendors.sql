ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);