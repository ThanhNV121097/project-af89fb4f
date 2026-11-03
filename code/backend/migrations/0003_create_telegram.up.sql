CREATE TABLE telegram (
    id      text PRIMARY KEY,
    bot     text NOT NULL DEFAULT '',
    "group" text NOT NULL DEFAULT '',
    chat_id text NOT NULL DEFAULT ''
);

INSERT INTO telegram (id, bot, "group", chat_id) VALUES ('group', '', '', '');
