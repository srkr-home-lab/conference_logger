-- name: AddPostLog :exec
INSERT post_log (id, session_id, pair_id, tag_name) VALUES (?, ?, ?, ?)
