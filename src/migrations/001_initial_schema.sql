
-- Create Enums
DO $$ BEGIN
    CREATE TYPE public.card_status_enum AS ENUM ('pending', 'in_editing', 'awaiting_approval', 'approved', 'sent_for_printing', 'completed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.branch_enum AS ENUM ('HYD', 'VIZAG', 'BLR', 'MUM', 'DEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.blood_group_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_role_enum AS ENUM ('admin', 'manager', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Tables

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  full_name text NULL,
  role public.user_role_enum NOT NULL DEFAULT 'user'::user_role_enum,
  branch public.branch_enum NULL,
  phone text NULL,
  avatar_url text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NULL DEFAULT true,
  blood_group text NULL,
  employee_id text NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT profiles_phone_check CHECK (
    (
      (phone ~* '^\+?[0-9\s\-\(\)]{10,20}$'::text)
      OR (phone IS NULL)
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles USING btree (branch) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles USING btree (is_active) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles USING btree (employee_id) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id bigserial NOT NULL,
  name text NOT NULL,
  employee_id text NOT NULL,
  branch public.branch_enum NOT NULL,
  email text NOT NULL,
  phone text NULL,
  blood_group public.blood_group_enum NULL,
  emergency_contact text NULL,
  country_code text NULL DEFAULT '+91'::text,
  photo text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NULL,
  is_active boolean NULL DEFAULT true,
  CONSTRAINT employees_pkey PRIMARY KEY (id),
  CONSTRAINT employees_employee_id_key UNIQUE (employee_id),
  CONSTRAINT employees_email_key UNIQUE (email),
  CONSTRAINT employees_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
  CONSTRAINT employees_employee_id_format CHECK ((employee_id ~* '^[A-Za-z0-9\-_]{3,50}$'::text)),
  CONSTRAINT employees_email_check CHECK (
    (
      email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
    )
  ),
  CONSTRAINT employees_phone_check CHECK (
    (
      (phone ~* '^\+?[0-9\s\-\(\)]{10,20}$'::text)
      OR (phone IS NULL)
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees USING btree (employee_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees USING btree (email) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_employees_branch ON public.employees USING btree (branch) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees USING gin (to_tsvector('english'::regconfig, name)) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees USING btree (is_active) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Card Batches Table
CREATE TABLE IF NOT EXISTS public.card_batches (
  id bigserial NOT NULL,
  batch_id text NOT NULL,
  name text NOT NULL,
  description text NULL,
  status public.card_status_enum NOT NULL DEFAULT 'pending'::card_status_enum,
  total_cards integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NULL,
  approved_by uuid NULL,
  approved_at timestamp with time zone NULL,
  sent_for_printing_at timestamp with time zone NULL,
  completed_at timestamp with time zone NULL,
  CONSTRAINT card_batches_pkey PRIMARY KEY (id),
  CONSTRAINT card_batches_batch_id_key UNIQUE (batch_id),
  CONSTRAINT card_batches_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users (id),
  CONSTRAINT card_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
  CONSTRAINT card_batches_batch_id_format CHECK ((batch_id ~* '^B-[0-9]{5,}$'::text)),
  CONSTRAINT card_batches_total_cards_check CHECK ((total_cards >= 0))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_card_batches_batch_id ON public.card_batches USING btree (batch_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_card_batches_status ON public.card_batches USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_card_batches_created_by ON public.card_batches USING btree (created_by) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_card_batches_created_at ON public.card_batches USING btree (created_at) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_card_batches_updated_at ON card_batches;
CREATE TRIGGER update_card_batches_updated_at BEFORE UPDATE ON card_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ID Cards Table
CREATE TABLE IF NOT EXISTS public.id_cards (
  id bigserial NOT NULL,
  employee_id bigint NOT NULL,
  batch_id text NULL,
  card_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.card_status_enum NOT NULL DEFAULT 'pending'::card_status_enum,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NULL,
  approved_by uuid NULL,
  approved_at timestamp with time zone NULL,
  notes text NULL,
  CONSTRAINT id_cards_pkey PRIMARY KEY (id),
  CONSTRAINT id_cards_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users (id),
  CONSTRAINT id_cards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
  CONSTRAINT id_cards_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT id_cards_card_data_check CHECK ((jsonb_typeof(card_data) = 'object'::text))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_id_cards_created_at ON public.id_cards USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_id_cards_created_by ON public.id_cards USING btree (created_by) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_id_cards_card_data ON public.id_cards USING gin (card_data) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_id_cards_employee_id ON public.id_cards USING btree (employee_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_id_cards_status ON public.id_cards USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_id_cards_batch_id ON public.id_cards USING btree (batch_id) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_id_cards_updated_at ON id_cards;
CREATE TRIGGER update_id_cards_updated_at BEFORE UPDATE ON id_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update batch card count
CREATE OR REPLACE FUNCTION update_batch_card_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.batch_id IS NOT NULL THEN
        UPDATE card_batches
        SET total_cards = (SELECT COUNT(*) FROM id_cards WHERE batch_id = NEW.batch_id)
        WHERE batch_id = NEW.batch_id;
    END IF;
    
    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.batch_id IS NOT NULL THEN
        UPDATE card_batches
        SET total_cards = (SELECT COUNT(*) FROM id_cards WHERE batch_id = OLD.batch_id)
        WHERE batch_id = OLD.batch_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_batch_card_count_trigger ON id_cards;
CREATE TRIGGER update_batch_card_count_trigger
AFTER INSERT OR DELETE OR UPDATE ON id_cards
FOR EACH ROW EXECUTE FUNCTION update_batch_card_count();

-- Views

-- Batch Statistics View
CREATE OR REPLACE VIEW public.batch_statistics AS
SELECT
  cb.batch_id,
  cb.name,
  cb.status,
  cb.total_cards,
  cb.created_at,
  cb.created_by,
  count(ic.id) FILTER (WHERE ic.status = 'pending'::card_status_enum) AS pending_cards,
  count(ic.id) FILTER (WHERE ic.status = 'in_editing'::card_status_enum) AS editing_cards,
  count(ic.id) FILTER (WHERE ic.status = 'awaiting_approval'::card_status_enum) AS awaiting_approval_cards,
  count(ic.id) FILTER (WHERE ic.status = 'approved'::card_status_enum) AS approved_cards,
  count(ic.id) FILTER (WHERE ic.status = 'sent_for_printing'::card_status_enum) AS sent_for_printing_cards,
  count(ic.id) FILTER (WHERE ic.status = 'completed'::card_status_enum) AS completed_cards
FROM
  card_batches cb
  LEFT JOIN id_cards ic ON cb.batch_id = ic.batch_id
GROUP BY
  cb.batch_id,
  cb.name,
  cb.status,
  cb.total_cards,
  cb.created_at,
  cb.created_by;

-- Employee Card Details View
CREATE OR REPLACE VIEW public.employee_card_details AS
SELECT
  e.id AS employee_db_id,
  e.name,
  e.employee_id,
  e.email,
  e.phone,
  e.branch,
  e.blood_group,
  e.emergency_contact,
  e.country_code,
  e.photo,
  ic.id AS card_id,
  ic.batch_id,
  ic.status AS card_status,
  ic.card_data,
  ic.created_at AS card_created_at,
  ic.updated_at AS card_updated_at,
  ic.notes,
  cb.name AS batch_name,
  p.full_name AS created_by_name
FROM
  employees e
  LEFT JOIN id_cards ic ON e.id = ic.employee_id
  LEFT JOIN card_batches cb ON ic.batch_id = cb.batch_id
  LEFT JOIN profiles p ON ic.created_by = p.id;
