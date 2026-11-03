CREATE TABLE admins (
    id    text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name  text NOT NULL DEFAULT '',
    role  text NOT NULL
);

-- password_hash is added by the auth module's own migration (AUTH SRS §7):
-- this table is the row auth signs against, not auth itself.
INSERT INTO admins (id, email, name, role) VALUES
    ('owner', 'brian.ng.2305@gmail.com', '', 'owner');
