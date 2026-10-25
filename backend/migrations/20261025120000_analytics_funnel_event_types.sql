-- +goose Up
-- Stage 8.7B: funnel steps a consenting browser may send (calculator,
-- request form, links to /contact or /calculator, mailto: links). Only the
-- list of allowed types grows; no row is changed. Swapped in one
-- transaction, so there is no moment without the check.
ALTER TABLE analytics_events DROP CONSTRAINT analytics_events_type_check;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_type_check CHECK (type IN (
    'page_view', 'promo_view', 'promo_click', 'whatsapp_click', 'phone_click',
    'chat_open', 'chat_first_message', 'lead_submit',
    'calculator_start', 'calculator_result', 'form_start', 'cta_click', 'email_click'
));

-- +goose Down
-- Back to the previous list for new rows only (NOT VALID): events of the
-- new types already stored are kept, not deleted. They expire with the
-- retention cleanup like any other event.
ALTER TABLE analytics_events DROP CONSTRAINT analytics_events_type_check;
ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_type_check CHECK (type IN (
    'page_view', 'promo_view', 'promo_click', 'whatsapp_click', 'phone_click',
    'chat_open', 'chat_first_message', 'lead_submit'
)) NOT VALID;
