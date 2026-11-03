CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE admins ADD COLUMN password_hash text;

-- pgcrypto's crypt()/gen_salt('bf') produces a standard bcrypt hash (cost
-- 10), the same format golang.org/x/crypto/bcrypt compares against — so the
-- initial password never appears in this file as anything but the literal
-- below, communicated to the owner out of band at merge time (AUTH SRS §7
-- open question). Change it after first sign-in; there is no UI for it yet
-- (owner updates the row directly, per the SRS's own assumption).
UPDATE admins SET password_hash = crypt('shelf-owner-2026', gen_salt('bf', 10)) WHERE id = 'owner';

ALTER TABLE admins ALTER COLUMN password_hash SET NOT NULL;

ALTER TABLE admins ADD CONSTRAINT ck_admins_role CHECK (role IN ('owner', 'admin'));
