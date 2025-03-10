-- Create a storage bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', true);

-- Set up security policies for the notes bucket
CREATE POLICY "Notes images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'notes');

CREATE POLICY "Authenticated users can upload note images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notes' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own note images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'notes' AND
  auth.uid() = owner
);

CREATE POLICY "Users can delete their own note images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notes' AND
  auth.uid() = owner
); 