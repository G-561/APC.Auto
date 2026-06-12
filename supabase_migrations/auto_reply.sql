-- Auto-reply feature
-- Sellers can set a message that fires automatically on the first buyer message in a new conversation.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auto_reply_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reply_message  text;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_auto_reply boolean DEFAULT false;

-- Trigger: fires after every message INSERT.
-- If the sender is a buyer AND this is the first message in the conversation
-- AND the seller has auto-reply enabled → insert the reply as the seller.
CREATE OR REPLACE FUNCTION fn_auto_reply()
RETURNS trigger AS $$
DECLARE
  v_seller_id  uuid;
  v_msg_count  int;
  v_enabled    bool;
  v_msg_text   text;
BEGIN
  -- Skip if this message is itself an auto-reply (prevents infinite loop)
  IF NEW.is_auto_reply THEN RETURN NEW; END IF;

  SELECT seller_id INTO v_seller_id FROM conversations WHERE id = NEW.conversation_id;
  IF v_seller_id IS NULL THEN RETURN NEW; END IF;

  -- Skip if the sender IS the seller (seller replying to their own conv)
  IF NEW.sender_id = v_seller_id THEN RETURN NEW; END IF;

  -- Only fire on the first message in this conversation
  SELECT COUNT(*) INTO v_msg_count FROM messages WHERE conversation_id = NEW.conversation_id;
  IF v_msg_count > 1 THEN RETURN NEW; END IF;

  SELECT auto_reply_enabled, auto_reply_message INTO v_enabled, v_msg_text
  FROM profiles WHERE id = v_seller_id;

  IF v_enabled AND v_msg_text IS NOT NULL AND trim(v_msg_text) <> '' THEN
    INSERT INTO messages (conversation_id, sender_id, text, is_auto_reply, created_at)
    VALUES (
      NEW.conversation_id,
      v_seller_id,
      trim(v_msg_text),
      true,
      NEW.created_at + interval '1 second'
    );

    -- Mark conversation unread for buyer so they see the auto-reply
    UPDATE conversations
    SET unread_buyer    = true,
        last_message_at = NEW.created_at + interval '1 second'
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_reply ON messages;
CREATE TRIGGER trg_auto_reply
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fn_auto_reply();
