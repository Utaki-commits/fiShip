-- sns_messagesテーブル：LINEおよびInstagramから受信したメッセージを保存する
-- Supabaseダッシュボード > SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS sns_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id       uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  channel         text NOT NULL CHECK (channel IN ('line', 'instagram')),
  sender_id       text,
  sender_name     text,
  message_text    text NOT NULL,
  received_at     timestamptz NOT NULL DEFAULT now(),
  ai_result       jsonb,
  status          text NOT NULL DEFAULT 'unprocessed'
                  CHECK (status IN ('unprocessed', 'registered', 'ignored')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- インデックス：よく使うクエリを高速化する
CREATE INDEX IF NOT EXISTS sns_messages_vessel_channel_status
  ON sns_messages (vessel_id, channel, status);

CREATE INDEX IF NOT EXISTS sns_messages_received_at
  ON sns_messages (received_at DESC);

-- RLS（行レベルセキュリティ）を有効化する
ALTER TABLE sns_messages ENABLE ROW LEVEL SECURITY;

-- 船長は自分の船に届いたメッセージのみ閲覧できる
CREATE POLICY "vessel_owner_select_sns_messages"
  ON sns_messages FOR SELECT
  USING (
    vessel_id IN (
      SELECT id FROM vessels WHERE user_id = auth.uid()
    )
  );

-- 船長は自分の船のメッセージのstatusのみ更新できる
CREATE POLICY "vessel_owner_update_sns_messages"
  ON sns_messages FOR UPDATE
  USING (
    vessel_id IN (
      SELECT id FROM vessels WHERE user_id = auth.uid()
    )
  );
