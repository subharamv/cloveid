-- Migration: 038_fix_employee_card_details_view
-- Purpose: Add print_status and zip_url columns to employee_card_details view
-- The view was created before print_status and zip_url were added to id_cards,
-- so bulk cards always show 'Pending' in IssuedCards regardless of actual status.

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
  p.full_name AS created_by_name,
  ic.print_status,
  ic.zip_url
FROM
  employees e
  LEFT JOIN id_cards ic ON e.id = ic.employee_id
  LEFT JOIN card_batches cb ON ic.batch_id = cb.batch_id
  LEFT JOIN profiles p ON ic.created_by = p.id;

SELECT 'Added print_status and zip_url to employee_card_details view' as migration_status;
