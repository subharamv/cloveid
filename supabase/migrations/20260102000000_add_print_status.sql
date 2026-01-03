-- Add print_status column to requests table
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS print_status VARCHAR(50) DEFAULT 'not_printed';

-- Add print_status column to id_cards table
ALTER TABLE id_cards
ADD COLUMN IF NOT EXISTS print_status VARCHAR(50) DEFAULT 'not_printed';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_print_status ON requests(print_status);
CREATE INDEX IF NOT EXISTS idx_id_cards_print_status ON id_cards(print_status);

-- Add a comment to describe the column
COMMENT ON COLUMN requests.print_status IS 'Status of printing: not_printed, printed, ready_to_collect';
COMMENT ON COLUMN id_cards.print_status IS 'Status of printing: not_printed, printed, ready_to_collect';
