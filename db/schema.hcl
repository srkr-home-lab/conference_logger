table "post_log" {
  schema = schema.conference_logger
  column "id" {
    null = false
    type = char(36)
  }
  column "session_id" {
    null = false
    type = char(36)
  }

  column "pair_id" {
    null = false
    type = char(36)
  }
  column "tag_name" {
    null = false
    type = varchar(255)
  }
  column "created_at" {
    null = false
    type = datetime(6)
    default = sql("CURRENT_TIMESTAMP(6)")
  }
  primary_key {
    columns = [column.id]
  }
}
schema "conference_logger" {
  charset = "utf8mb4"
  collate = "utf8mb4_0900_ai_ci"
}
