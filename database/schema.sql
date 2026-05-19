DROP DATABASE IF EXISTS findit_uiu;
CREATE DATABASE findit_uiu DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE findit_uiu;
SET default_storage_engine=InnoDB;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS personal_access_tokens;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS item_tags;
DROP TABLE IF EXISTS item_images;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  student_id VARCHAR(20) NULL DEFAULT NULL,
  department VARCHAR(100) NULL DEFAULT NULL,
  phone VARCHAR(20) NULL DEFAULT NULL,
  bio TEXT NULL,
  role ENUM('admin','student') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  items_lost INT NOT NULL DEFAULT 0,
  items_found INT NOT NULL DEFAULT 0,
  items_recovered INT NOT NULL DEFAULT 0,
  items_returned INT NOT NULL DEFAULT 0,
  email_verified_at TIMESTAMP NULL DEFAULT NULL,
  remember_token VARCHAR(100) NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_student_id_unique (student_id),
  KEY users_role_index (role)
);

CREATE TABLE personal_access_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tokenable_type VARCHAR(255) NOT NULL,
  tokenable_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL,
  abilities TEXT NULL,
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY personal_access_tokens_token_unique (token),
  KEY personal_access_tokens_tokenable_type_tokenable_id_index (tokenable_type, tokenable_id)
);

CREATE TABLE categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(10) NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY categories_name_unique (name)
);

CREATE TABLE items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type ENUM('lost','found') NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category_id BIGINT UNSIGNED NULL DEFAULT NULL,
  color VARCHAR(50) NULL DEFAULT NULL,
  brand_model VARCHAR(100) NULL DEFAULT NULL,
  location VARCHAR(255) NULL DEFAULT NULL,
  specific_spot VARCHAR(200) NULL DEFAULT NULL,
  lost_found_date DATE NOT NULL,
  lost_found_time TIME NULL DEFAULT NULL,
  current_location VARCHAR(200) NULL DEFAULT NULL,
  status ENUM('awaiting_approval','active','claim_in_progress','resolved','closed') NOT NULL DEFAULT 'awaiting_approval',
  posted_by BIGINT UNSIGNED NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  admin_note TEXT NULL,
  reference_id VARCHAR(30) NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY items_reference_id_unique (reference_id),
  CONSTRAINT items_category_id_foreign FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT items_posted_by_foreign FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
  KEY items_type_index (type),
  KEY items_status_index (status),
  KEY items_posted_by_index (posted_by),
  KEY items_lost_found_date_index (lost_found_date),
  KEY items_is_approved_index (is_approved),
  KEY items_location_index (location),
  FULLTEXT KEY items_search_fulltext (title, description)
);

CREATE TABLE item_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT item_images_item_id_foreign FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  KEY item_images_item_id_index (item_id)
);

CREATE TABLE item_tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  tag VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY item_tags_item_id_tag_unique (item_id, tag),
  CONSTRAINT item_tags_item_id_foreign FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  KEY item_tags_tag_index (tag)
);

CREATE TABLE claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  claimer_id BIGINT UNSIGNED NOT NULL,
  relationship_type ENUM('owner','behalf','found_it') NOT NULL DEFAULT 'owner',
  proof_text TEXT NOT NULL,
  message TEXT NOT NULL,
  preferred_location VARCHAR(100) NULL DEFAULT NULL,
  availability VARCHAR(200) NULL DEFAULT NULL,
  status ENUM('pending','accepted','rejected','resolved') NOT NULL DEFAULT 'pending',
  admin_note TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT claims_item_id_foreign FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT claims_claimer_id_foreign FOREIGN KEY (claimer_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY claims_item_id_index (item_id),
  KEY claims_claimer_id_index (claimer_id),
  KEY claims_status_index (status)
);

CREATE TABLE conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NULL DEFAULT NULL,
  participant_one BIGINT UNSIGNED NOT NULL,
  participant_two BIGINT UNSIGNED NOT NULL,
  last_activity TIMESTAMP NULL DEFAULT NULL,
  closed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT conversations_item_id_foreign FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL,
  CONSTRAINT conversations_participant_one_foreign FOREIGN KEY (participant_one) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT conversations_participant_two_foreign FOREIGN KEY (participant_two) REFERENCES users(id) ON DELETE CASCADE,
  KEY conversations_participant_one_index (participant_one),
  KEY conversations_participant_two_index (participant_two),
  KEY conversations_item_id_index (item_id)
);

CREATE TABLE messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_foreign FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_foreign FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY messages_conversation_id_index (conversation_id),
  KEY messages_sender_id_index (sender_id),
  KEY messages_is_read_index (is_read)
);

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('match','approved','rejected','claim_request','found_report','claim_accepted','claim_rejected','message','new_report','new_user','claim_submitted','system') NOT NULL DEFAULT 'system',
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  related_item_id BIGINT UNSIGNED NULL DEFAULT NULL,
  related_conversation_id BIGINT UNSIGNED NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_related_item_id_foreign FOREIGN KEY (related_item_id) REFERENCES items(id) ON DELETE SET NULL,
  CONSTRAINT notifications_related_conversation_id_foreign FOREIGN KEY (related_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  KEY notifications_user_id_index (user_id),
  KEY notifications_related_conversation_id_index (related_conversation_id),
  KEY notifications_is_read_index (is_read)
);

CREATE TABLE admin_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NOT NULL,
  action ENUM('approved','rejected','deleted','status_changed','user_deactivated') NOT NULL,
  target_type ENUM('item','user','claim') NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT admin_logs_admin_id_foreign FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY admin_logs_admin_id_index (admin_id),
  KEY admin_logs_created_at_index (created_at)
);

CREATE TABLE email_verification_tokens (
  email VARCHAR(150) PRIMARY KEY,
  token VARCHAR(64) NOT NULL,
  payload TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL
);

CREATE TABLE password_reset_tokens (
  email VARCHAR(150) PRIMARY KEY,
  token VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL
);

SET FOREIGN_KEY_CHECKS=1;
