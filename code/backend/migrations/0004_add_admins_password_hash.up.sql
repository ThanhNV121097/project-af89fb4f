ALTER TABLE admins ADD COLUMN password_hash text;

-- bcrypt hash (cost 10) of the owner's initial password, communicated to
-- the owner out of band at merge time (AUTH SRS §7 open question).
UPDATE admins SET password_hash = '$2a$10$O5VZq0Iw1b8M0Z5m5c6S4eU1q3bYx8m0K7pT1gkq9z1m5Q7f0YbQe' WHERE id = 'owner';

ALTER TABLE admins ALTER COLUMN password_hash SET NOT NULL;

ALTER TABLE admins ADD CONSTRAINT ck_admins_role CHECK (role IN ('owner', 'admin'));
