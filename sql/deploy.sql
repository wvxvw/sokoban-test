-- You need to create a user to access MySQL database.
-- After you do this, also edit the `config.json' file
-- to reflect your changes, the properties should be
-- self-explanatory.
-- to run this script manually, do:
-- $ mysql < deploy.sql

CREATE DATABASE sokoban;
USE sokoban;
CREATE USER 'wvxvw'@'localhost' IDENTIFIED BY 'secret';
GRANT ALL ON sokoban TO 'wvxvw'@'localhost';
CREATE TABLE players
       (uid varchar(32),
       level int(8),
       active timestamp,
       state varchar(72),
       coin_picked bit,
       magnet_picked bit);
