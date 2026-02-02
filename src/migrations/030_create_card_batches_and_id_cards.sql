-- Create card_batches table
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

-- Create id_cards table
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
  zip_url text NULL,
  photo_url text NULL,
  print_status character varying(50) NULL DEFAULT 'not_printed'::character varying,
  CONSTRAINT id_cards_pkey PRIMARY KEY (id),
  CONSTRAINT id_cards_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users (id),
  CONSTRAINT id_cards_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES card_batches (batch_id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_id_cards_print_status ON public.id_cards USING btree (print_status) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS update_id_cards_updated_at ON id_cards;
CREATE TRIGGER update_id_cards_updated_at BEFORE UPDATE ON id_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update batch card count
CREATE OR REPLACE FUNCTION update_batch_card_count()
RETURNS TRIGGER AS $$
DECLARE
  total_count INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Update card count when a card is deleted
    SELECT COUNT(*) INTO total_count FROM id_cards WHERE batch_id = OLD.batch_id;
    UPDATE card_batches SET total_cards = total_count WHERE batch_id = OLD.batch_id;
    RETURN OLD;
  ELSE
    -- Update card count when a card is inserted or updated
    SELECT COUNT(*) INTO total_count FROM id_cards WHERE batch_id = NEW.batch_id;
    UPDATE card_batches SET total_cards = total_count WHERE batch_id = NEW.batch_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_batch_card_count_trigger ON id_cards;
CREATE TRIGGER update_batch_card_count_trigger
AFTER INSERT OR DELETE OR UPDATE ON id_cards
FOR EACH ROW
EXECUTE FUNCTION update_batch_card_count();

-- Create function to update batch status when all cards are completed
CREATE OR REPLACE FUNCTION check_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
  batch_status card_status_enum;
  completed_count INT;
  total_count INT;
BEGIN
  -- Check if all cards in the batch are marked as "completed"
  SELECT COUNT(*) INTO total_count FROM id_cards WHERE batch_id = NEW.batch_id;
  SELECT COUNT(*) INTO completed_count FROM id_cards WHERE batch_id = NEW.batch_id AND status = 'completed'::card_status_enum;
  
  -- If all cards are completed and total > 0, update batch status to completed
  IF total_count > 0 AND completed_count = total_count THEN
    UPDATE card_batches 
    SET status = 'completed'::card_status_enum, 
        completed_at = NOW()
    WHERE batch_id = NEW.batch_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_batch_completion_trigger ON id_cards;
CREATE TRIGGER check_batch_completion_trigger
AFTER UPDATE ON id_cards
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION check_batch_completion();

-- Enable RLS
ALTER TABLE public.card_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for card_batches
CREATE POLICY card_batches_select_policy ON card_batches FOR SELECT USING (true);
CREATE POLICY card_batches_insert_policy ON card_batches FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY card_batches_update_policy ON card_batches FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = approved_by);
CREATE POLICY card_batches_delete_policy ON card_batches FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for id_cards
CREATE POLICY id_cards_select_policy ON id_cards FOR SELECT USING (true);
CREATE POLICY id_cards_insert_policy ON id_cards FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY id_cards_update_policy ON id_cards FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = approved_by);
CREATE POLICY id_cards_delete_policy ON id_cards FOR DELETE USING (auth.uid() = created_by);
