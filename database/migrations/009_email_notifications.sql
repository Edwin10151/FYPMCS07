CREATE TABLE IF NOT EXISTS email_notification_delivery (
    delivery_id       SERIAL PRIMARY KEY,
    semester_id       INT          NOT NULL REFERENCES semester(semester_id) ON DELETE CASCADE,
    sent_by           INT          NOT NULL REFERENCES app_user(user_id),
    recipient_user_id INT          REFERENCES app_user(user_id) ON DELETE SET NULL,
    recipient_email   VARCHAR(200) NOT NULL,
    subject           VARCHAR(200) NOT NULL,
    status            VARCHAR(20)  NOT NULL CHECK (status IN ('sent', 'failed')),
    error_message     VARCHAR(500),
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_semester
    ON email_notification_delivery(semester_id, created_at DESC);
