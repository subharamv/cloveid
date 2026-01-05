-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    full_name text NOT NULL,
    employee_id text NOT NULL,
    branch branch_enum NOT NULL,
    blood_group blood_group_enum,
    emergency_contact text,
    country_code text DEFAULT '+91',
    photo_url text,
    status text DEFAULT 'Pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own requests" ON requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requests" ON requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all requests" ON requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE 
            id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can update requests" ON requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE 
            id = auth.uid() AND role IN ('admin', 'manager')
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
