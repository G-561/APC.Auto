-- Allow authenticated users to insert notifications for other users
-- (sellers notifying buyers). Read/update/delete remain restricted to own rows.

CREATE POLICY "Authenticated users can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);
