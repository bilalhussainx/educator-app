-- Add document_id column to session_requests table
ALTER TABLE session_requests 
ADD COLUMN IF NOT EXISTS document_id UUID;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'session_requests' AND column_name = 'document_id';