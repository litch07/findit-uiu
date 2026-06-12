USE findit_uiu;
SET FOREIGN_KEY_CHECKS=0;

DELETE FROM admin_logs;
DELETE FROM notifications;
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM claims;
DELETE FROM item_tags;
DELETE FROM item_images;
DELETE FROM items;
DELETE FROM categories;
DELETE FROM personal_access_tokens;
DELETE FROM email_verification_tokens;
DELETE FROM password_reset_tokens;
DELETE FROM users;

SET FOREIGN_KEY_CHECKS=1;

INSERT INTO users
  (id, name, email, password, student_id, department, phone, bio, avatar_url, role, is_active, is_banned, email_verified_at, remember_token, created_at, updated_at)
VALUES
  (1, 'Admin UIU', 'findituiu@gmail.com', '$2y$10$ROV9Iq0iunmpEuqwrSHuke8wZm94IRiXpQ2DSd68sPKlP8tDVv6bK', NULL, 'Administration', '+8801700000000', 'FindIt portal administrator responsible for report review and moderation.', NULL, 'admin', 1, 0, '2026-01-01 09:00:00', NULL, '2026-01-01 09:00:00', '2026-01-01 09:00:00'),
  (2, 'Sadid Ahmed', 'sahmed2330154@bscse.uiu.ac.bd', '$2y$10$SXPdsUJt/1M9FC7HzMnEyOMNsMXm3QkZsC9rlufA6hZ9JGWoEuADa', '0112330154', 'BSc in Computer Science and Engineering', '+8801811111111', 'CSE student at UIU. Usually around the lab block and library.', NULL, 'student', 1, 0, '2026-01-03 10:00:00', NULL, '2026-01-03 10:00:00', '2026-01-03 10:00:00'),
  (3, 'M.M. Sayem Prodhan', 'mprodhan2330411@bscse.uiu.ac.bd', '$2y$10$SXPdsUJt/1M9FC7HzMnEyOMNsMXm3QkZsC9rlufA6hZ9JGWoEuADa', '0112330411', 'BSc in Computer Science and Engineering', '+8801822222222', 'CSE student. Often attends classes in lecture halls and the library.', NULL, 'student', 1, 0, '2026-01-04 11:00:00', NULL, '2026-01-04 11:00:00', '2026-01-04 11:00:00'),
  (4, 'Md. Assaduzzaman Nur', 'mnur2230442@bscse.uiu.ac.bd', '$2y$10$SXPdsUJt/1M9FC7HzMnEyOMNsMXm3QkZsC9rlufA6hZ9JGWoEuADa', '0112230442', 'BSc in Computer Science and Engineering', '+8801833333333', 'UIU CSE student and FindIt tester. Usually around cafeteria and parking area.', NULL, 'student', 1, 0, '2026-01-05 12:00:00', NULL, '2026-01-05 12:00:00', '2026-01-05 12:00:00');

INSERT INTO categories (id, name, icon, created_at, updated_at) VALUES
  (1, 'Electronics', 'phone', '2026-01-01 09:05:00', '2026-01-01 09:05:00'),
  (2, 'Clothing', 'shirt', '2026-01-01 09:05:00', '2026-01-01 09:05:00'),
  (3, 'Documents', 'file', '2026-01-01 09:05:00', '2026-01-01 09:05:00'),
  (4, 'Accessories', 'watch', '2026-01-01 09:05:00', '2026-01-01 09:05:00'),
  (5, 'Cards & ID', 'card', '2026-01-01 09:05:00', '2026-01-01 09:05:00'),
  (6, 'Keys', 'key', '2026-01-01 09:05:00', '2026-01-01 09:05:00'),
  (7, 'Books', 'book', '2026-01-01 09:05:00', '2026-01-01 09:05:00'),
  (8, 'Other', 'box', '2026-01-01 09:05:00', '2026-01-01 09:05:00');

INSERT INTO items
  (id, display_id, type, title, description, category_id, color, brand_model, location, specific_spot, lost_found_date, lost_found_time, current_location, status, posted_by, view_count, is_approved, admin_note, reference_id, created_at, updated_at)
VALUES
  (1, NULL, 'lost', 'Samsung Galaxy Phone', 'Lost a Samsung Galaxy phone with a matte black case. The lock screen has a photo from the UIU courtyard. It may have been left on a reading table after group study.', 1, 'Black', 'Samsung Galaxy S23', 'UIU Library 2nd Floor', 'Reading table near the east window', '2026-01-08', '15:20:00', NULL, 'active', 2, 34, 1, 'Approved for public listing.', 'LF-2026-0001', '2026-01-08 15:45:00', '2026-01-08 15:45:00'),
  (2, NULL, 'found', 'UIU Student ID Card', 'Found a UIU student ID card after lunch. The card is safe and can be verified by name, student ID, and department before handover.', 5, 'White', NULL, 'UIU Cafeteria', 'Table beside the juice counter', '2026-01-09', '13:10:00', 'Cafeteria service counter', 'resolved', 3, 27, 1, 'Resolved after owner verification.', 'FF-2026-0001', '2026-01-09 13:35:00', '2026-01-13 10:20:00'),
  (3, NULL, 'found', 'Black Wallet', 'Found a black leather wallet containing several cards and receipts. No cash amount will be disclosed publicly; owner must describe contents for verification.', 4, 'Black', 'Leather bi-fold wallet', 'Lecture Hall 302', 'Under the third row desk', '2026-01-10', '16:00:00', 'Department office front desk', 'claim_in_progress', 4, 42, 1, 'Claim accepted after contents matched.', 'FF-2026-0002', '2026-01-10 16:25:00', '2026-01-17 12:00:00'),
  (4, NULL, 'lost', 'Apple AirPods', 'Lost white AirPods in a charging case. The case has a small blue sticker on the back and the Bluetooth name includes Sadid.', 1, 'White', 'Apple AirPods 2nd Gen', 'UIU Lab Block B', 'Computer lab corridor bench', '2026-01-11', '11:40:00', NULL, 'active', 2, 19, 1, 'Approved for public listing.', 'LF-2026-0002', '2026-01-11 12:15:00', '2026-01-11 12:15:00'),
  (5, NULL, 'lost', 'UIU Hoodie', 'Lost a navy UIU hoodie after prayer break. It has the UIU logo on the chest and a small notebook in one pocket.', 2, 'Navy Blue', 'UIU hoodie', 'UIU Prayer Room', 'Back row near the shoe rack', '2026-01-12', '17:30:00', NULL, 'resolved', 3, 15, 1, 'Marked resolved after finder confirmation.', 'LF-2026-0003', '2026-01-12 18:05:00', '2026-01-18 09:30:00'),
  (6, NULL, 'found', 'Keys with Keychain', 'Found a set of three keys with a round UIU keychain. One key has a green plastic cap. Owner must identify the other keychain detail.', 6, 'Silver', NULL, 'UIU Parking Area', 'Near the motorcycle parking row', '2026-01-14', '09:25:00', 'Security desk near parking gate', 'active', 4, 22, 1, 'Approved for public listing.', 'FF-2026-0003', '2026-01-14 09:50:00', '2026-01-14 09:50:00'),
  (7, NULL, 'lost', 'Data Structures Book', 'Lost a Data Structures and Algorithms textbook with handwritten notes and highlighted chapters. The first page has my student ID written in pencil.', 7, 'Blue', 'Data Structures and Algorithms in C++', 'Central Library', 'Return shelf beside CSE books', '2026-01-15', '14:00:00', NULL, 'claim_in_progress', 4, 31, 1, 'Claim reviewed but final handover pending.', 'LF-2026-0004', '2026-01-15 14:30:00', '2026-01-20 11:00:00'),
  (8, NULL, 'found', 'Prescription Glasses', 'Found prescription glasses in a black hard case. The case was left on a cafeteria chair after the afternoon rush.', 4, 'Black', 'Prescription glasses', 'UIU Cafeteria', 'Chair near the north wall', '2026-01-17', '16:20:00', 'Cafeteria manager desk', 'active', 2, 13, 1, 'Approved for public listing.', 'FF-2026-0004', '2026-01-17 16:45:00', '2026-01-17 16:45:00'),
  (9, NULL, 'lost', 'Lab Access Card', 'Lost my lab access card after a CSE lab session. The card has a blue strip and may be inside a transparent card holder.', 5, 'Blue and White', 'UIU Lab access card', 'Computer Lab 401', 'Beside workstation 18', '2026-01-19', '12:50:00', NULL, 'active', 3, 18, 1, 'Approved for public listing.', 'LF-2026-0005', '2026-01-19 13:10:00', '2026-01-19 13:10:00'),
  (10, NULL, 'found', 'Green Jacket', 'Found a green jacket after evening class. It has a zipper pocket and a folded class routine paper inside.', 2, 'Green', 'Casual jacket', 'Lecture Hall B-201', 'Back row left corner', '2026-01-21', '18:35:00', 'Lost and found desk', 'resolved', 4, 24, 1, 'Resolved after routine paper was verified.', 'FF-2026-0005', '2026-01-21 19:00:00', '2026-01-24 10:15:00'),
  (11, NULL, 'lost', 'Casio Scientific Calculator', 'Submitted for admin review: lost a Casio scientific calculator with a white label on the back. It was last used during a quiz and may have been left on a classroom desk.', 1, 'Black', 'Casio fx-991ES Plus', 'Room 501', 'Front row desk near the projector', '2026-01-25', '10:30:00', NULL, 'awaiting_approval', 2, 0, 0, NULL, 'LF-2026-0006', '2026-01-25 11:00:00', '2026-01-25 11:00:00');

INSERT INTO item_images (id, item_id, image_url, is_primary, created_at, updated_at) VALUES
  (1, 1, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80', 1, '2026-01-08 15:45:00', '2026-01-08 15:45:00'),
  (2, 2, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80', 1, '2026-01-09 13:35:00', '2026-01-09 13:35:00'),
  (3, 3, 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80', 1, '2026-01-10 16:25:00', '2026-01-10 16:25:00'),
  (4, 4, 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=900&q=80', 1, '2026-01-11 12:15:00', '2026-01-11 12:15:00'),
  (5, 5, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80', 1, '2026-01-12 18:05:00', '2026-01-12 18:05:00'),
  (6, 6, 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=900&q=80', 1, '2026-01-14 09:50:00', '2026-01-14 09:50:00'),
  (7, 7, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=900&q=80', 1, '2026-01-15 14:30:00', '2026-01-15 14:30:00'),
  (8, 8, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=80', 1, '2026-01-17 16:45:00', '2026-01-17 16:45:00'),
  (9, 9, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=900&q=80', 1, '2026-01-19 13:10:00', '2026-01-19 13:10:00'),
  (10, 10, 'https://images.unsplash.com/photo-1548126032-079a0fb0099d?auto=format&fit=crop&w=900&q=80', 1, '2026-01-21 19:00:00', '2026-01-21 19:00:00');

INSERT INTO item_tags (id, item_id, tag) VALUES
  (1, 1, 'samsung'),
  (2, 1, 'phone'),
  (3, 2, 'student-id'),
  (4, 2, 'card'),
  (5, 3, 'wallet'),
  (6, 3, 'leather'),
  (7, 4, 'airpods'),
  (8, 4, 'earbuds'),
  (9, 5, 'hoodie'),
  (10, 5, 'uiu'),
  (11, 6, 'keys'),
  (12, 6, 'keychain'),
  (13, 7, 'book'),
  (14, 7, 'cse'),
  (15, 8, 'glasses'),
  (16, 9, 'access-card'),
  (17, 10, 'jacket'),
  (18, 11, 'calculator'),
  (19, 11, 'casio');

INSERT INTO claims
  (id, item_id, claimer_id, relationship_type, proof_text, message, preferred_location, availability, status, admin_note, created_at, updated_at)
VALUES
  (1, 1, 3, 'behalf', 'I am helping a classmate recover a black Samsung phone from the library 2nd floor. The lock screen photo matches the campus courtyard description.', 'Hi Sadid, I think this may be my classmate''s phone. We can meet near the library desk so they can unlock it and confirm.', 'UIU Library help desk', '2026-01-09 after 2 PM', 'pending', NULL, '2026-01-09 10:15:00', '2026-01-09 10:15:00'),
  (2, 3, 2, 'owner', 'The wallet is black leather, has my UIU ID card, a bKash receipt, and a folded bus ticket inside. I can show my NID photo for verification.', 'This is my wallet. I lost it after a class in Lecture Hall 302. Please let me know when I can collect it.', 'Lecture Hall 302 entrance', '2026-01-11 between 12 PM and 3 PM', 'accepted', 'Contents matched. Claim accepted and handover scheduled.', '2026-01-11 09:30:00', '2026-01-12 15:00:00'),
  (3, 7, 3, 'found_it', 'Found on 2026-01-16. A blue Data Structures and Algorithms in C++ textbook was left on a central library table. The first page has a pencil-written student ID and several highlighted Chapter 5 notes.', 'I may have found this Data Structures book. Please message me so we can verify the notes and arrange a handover.', 'Central Library reading table', 'With me until owner verification', 'rejected', 'Found report rejected because the handwritten note details did not match the original owner description.', '2026-01-16 10:20:00', '2026-01-17 12:10:00');

INSERT INTO conversations (id, item_id, participant_one, participant_two, last_activity, closed_at, created_at, updated_at) VALUES
  (1, 1, 2, 3, '2026-01-09 16:45:00', NULL, '2026-01-09 10:30:00', '2026-01-09 16:45:00'),
  (2, 3, 2, 4, '2026-01-11 14:10:00', NULL, '2026-01-11 09:45:00', '2026-01-11 14:10:00');

INSERT INTO messages (id, conversation_id, sender_id, body, is_read, message_image_url, created_at, updated_at) VALUES
  (1, 1, 3, 'Hi Sadid, I saw your Samsung phone report. I found one on the library 2nd floor today.', 1, NULL, '2026-01-09 10:30:00', '2026-01-09 10:30:00'),
  (2, 1, 2, 'Thanks Sayem. Does it have a matte black case and a courtyard photo on the lock screen?', 1, NULL, '2026-01-09 10:42:00', '2026-01-09 10:42:00'),
  (3, 1, 3, 'Yes, exactly. I left it with the library help desk so it stays safe.', 1, NULL, '2026-01-09 10:55:00', '2026-01-09 10:55:00'),
  (4, 1, 2, 'I can come after my 2 PM class with my student ID and unlock it in front of you.', 1, NULL, '2026-01-09 11:08:00', '2026-01-09 11:08:00'),
  (5, 1, 3, 'Great. I will be near the library desk around 4:45 PM.', 0, NULL, '2026-01-09 16:45:00', '2026-01-09 16:45:00'),
  (6, 2, 2, 'Assaduzzaman, I saw your black wallet found post. I think it might be mine from Lecture Hall 302.', 1, NULL, '2026-01-11 09:45:00', '2026-01-11 09:45:00'),
  (7, 2, 4, 'Can you describe two things inside it? I kept it with the department office.', 1, NULL, '2026-01-11 10:05:00', '2026-01-11 10:05:00'),
  (8, 2, 2, 'It has my UIU ID card and a folded bus ticket. There should also be a bKash receipt.', 1, NULL, '2026-01-11 10:18:00', '2026-01-11 10:18:00'),
  (9, 2, 4, 'That matches. Please come to the Lecture Hall 302 entrance around 2:15 PM and bring your ID.', 0, NULL, '2026-01-11 14:10:00', '2026-01-11 14:10:00');

INSERT INTO notifications
  (id, user_id, type, title, message, is_read, related_item_id, related_conversation_id, created_at, updated_at)
VALUES
  (1, 2, 'claim_request', 'New Claim Request', 'M.M. Sayem Prodhan submitted a claim update for your lost Samsung Galaxy Phone.', 0, 1, NULL, '2026-01-09 10:16:00', '2026-01-09 10:16:00'),
  (2, 2, 'message', 'New Message Received', 'M.M. Sayem Prodhan messaged you about the Samsung phone recovery.', 0, 1, NULL, '2026-01-09 16:45:00', '2026-01-09 16:45:00'),
  (3, 2, 'claim_accepted', 'Claim Accepted', 'Your claim for the Black Wallet was accepted. Please coordinate pickup with the finder.', 1, 3, NULL, '2026-01-12 15:05:00', '2026-01-12 15:05:00'),
  (4, 3, 'claim_request', 'New Claim Request', 'A student responded to your UIU Student ID Card report and requested verification.', 0, 2, NULL, '2026-01-10 09:20:00', '2026-01-10 09:20:00'),
  (5, 3, 'claim_rejected', 'Claim Rejected', 'Your claim for the Data Structures Book was rejected because the verification details did not match.', 1, 7, NULL, '2026-01-17 12:12:00', '2026-01-17 12:12:00'),
  (6, 1, 'new_report', 'New Report Submitted', 'Sadid Ahmed posted a lost report: Samsung Galaxy Phone.', 0, 1, NULL, '2026-01-08 15:46:00', '2026-01-08 15:46:00'),
  (7, 1, 'new_report', 'New Report Submitted', 'Md. Assaduzzaman Nur posted a found report: Black Wallet.', 0, 3, NULL, '2026-01-10 16:26:00', '2026-01-10 16:26:00'),
  (8, 1, 'new_user', 'New Student Registered', 'M.M. Sayem Prodhan completed registration with a UIU student email.', 1, NULL, NULL, '2026-01-04 11:02:00', '2026-01-04 11:02:00'),
  (9, 1, 'new_report', 'New Report Submitted', 'Sadid Ahmed posted a lost report: Casio Scientific Calculator.', 0, 11, NULL, '2026-01-25 11:01:00', '2026-01-25 11:01:00'),
  (10, 4, 'found_report', 'Someone May Have Found Your Item!', 'M.M. Sayem Prodhan says they may have found your "Data Structures Book"', 0, 7, NULL, '2026-01-16 10:21:00', '2026-01-16 10:21:00');

INSERT INTO admin_logs
  (id, admin_id, action, target_type, target_id, note, created_at, updated_at)
VALUES
  (1, 1, 'approved', 'item', 1, 'Approved Samsung Galaxy Phone lost report after checking description and location.', '2026-01-08 15:50:00', '2026-01-08 15:50:00'),
  (2, 1, 'approved', 'item', 2, 'Approved UIU Student ID Card found report and allowed public listing.', '2026-01-09 13:45:00', '2026-01-09 13:45:00'),
  (3, 1, 'status_changed', 'item', 2, 'Changed Student ID Card report status to Resolved after owner pickup.', '2026-01-13 10:20:00', '2026-01-13 10:20:00'),
  (4, 1, 'status_changed', 'item', 3, 'Changed Black Wallet report status to Claim in Progress after accepted claim verification.', '2026-01-17 12:00:00', '2026-01-17 12:00:00'),
  (5, 1, 'rejected', 'claim', 3, 'Rejected Data Structures Book claim because note details did not match the original owner.', '2026-01-17 12:10:00', '2026-01-17 12:10:00');

UPDATE users u
SET
  items_lost = (SELECT COUNT(*) FROM items i WHERE i.posted_by = u.id AND i.type = 'lost'),
  items_found = (SELECT COUNT(*) FROM items i WHERE i.posted_by = u.id AND i.type = 'found'),
  items_recovered =
    (SELECT COUNT(*) FROM items i WHERE i.posted_by = u.id AND i.type = 'lost' AND i.status = 'resolved') +
    (SELECT COUNT(*) FROM claims c JOIN items i ON i.id = c.item_id WHERE c.claimer_id = u.id AND c.status = 'resolved' AND i.type = 'found'),
  items_returned =
    (SELECT COUNT(*) FROM items i WHERE i.posted_by = u.id AND i.type = 'found' AND i.status = 'resolved') +
    (SELECT COUNT(*) FROM claims c JOIN items i ON i.id = c.item_id WHERE c.claimer_id = u.id AND c.status = 'resolved' AND i.type = 'lost')
WHERE u.role = 'student';
