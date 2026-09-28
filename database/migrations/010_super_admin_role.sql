-- Adds a super_admin tier above management. Management keeps every permission
-- it has today except two things now reserved for super_admin: granting the
-- management/super_admin role to an account, and creating/editing/deleting
-- unit offerings.
INSERT INTO role (role_name, permission_level)
VALUES ('super_admin', 40)
ON CONFLICT (role_name) DO NOTHING;
