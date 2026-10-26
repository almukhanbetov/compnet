-- +goose Up
-- Price management: why a tariff's price changed. Stored with the version
-- (versions stay immutable), shown in the price history with the author and
-- the previous price. The seeded versions have no reason.
ALTER TABLE tariff_versions
    ADD COLUMN change_reason TEXT NOT NULL DEFAULT '',
    ADD CONSTRAINT tariff_versions_reason_check CHECK (char_length(change_reason) <= 500);

-- +goose Down
ALTER TABLE tariff_versions DROP COLUMN change_reason;
