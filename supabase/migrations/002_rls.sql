-- =============================================================
-- 002_rls.sql
-- Row Level Security — invite-only, org-scoped access.
-- =============================================================

-- ---------------------------------------------------------------
-- profiles
-- Extends auth.users with org membership and role.
-- ---------------------------------------------------------------
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  display_name    text,
  role            text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile skeleton on sign-up (org + role assigned by admin separately)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, organization_id, display_name)
  SELECT
    NEW.id,
    (SELECT id FROM organizations LIMIT 1),  -- single-org setup; extend for multi-tenant
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  ;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ---------------------------------------------------------------
-- Helper: get caller's org
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ---------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_configs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_pages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------
-- organizations — members read their own org
-- ---------------------------------------------------------------
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = current_org_id());


-- ---------------------------------------------------------------
-- profiles — members read own org members; admins manage all
-- ---------------------------------------------------------------
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (current_user_role() = 'admin');


-- ---------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "projects_write" ON projects
  FOR ALL USING (
    organization_id = current_org_id()
    AND current_user_role() = 'admin'
  );


-- ---------------------------------------------------------------
-- social_accounts
-- ---------------------------------------------------------------
CREATE POLICY "social_accounts_select" ON social_accounts
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "social_accounts_write" ON social_accounts
  FOR ALL USING (
    organization_id = current_org_id()
    AND current_user_role() = 'admin'
  );


-- ---------------------------------------------------------------
-- channel_configs
-- ---------------------------------------------------------------
CREATE POLICY "channel_configs_select" ON channel_configs
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "channel_configs_write" ON channel_configs
  FOR ALL USING (
    organization_id = current_org_id()
    AND current_user_role() = 'admin'
  );


-- ---------------------------------------------------------------
-- actions — all members read + write; no cross-org leakage
-- ---------------------------------------------------------------
CREATE POLICY "actions_select" ON actions
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "actions_insert" ON actions
  FOR INSERT WITH CHECK (organization_id = current_org_id());

CREATE POLICY "actions_update" ON actions
  FOR UPDATE USING (organization_id = current_org_id());

CREATE POLICY "actions_delete" ON actions
  FOR DELETE USING (
    organization_id = current_org_id()
    AND current_user_role() = 'admin'
  );


-- ---------------------------------------------------------------
-- competitor_pages
-- ---------------------------------------------------------------
CREATE POLICY "competitor_pages_select" ON competitor_pages
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "competitor_pages_write" ON competitor_pages
  FOR ALL USING (
    organization_id = current_org_id()
    AND current_user_role() = 'admin'
  );


-- ---------------------------------------------------------------
-- competitor_snapshots — read-only for all members
-- ---------------------------------------------------------------
CREATE POLICY "snapshots_select" ON competitor_snapshots
  FOR SELECT USING (
    competitor_page_id IN (
      SELECT id FROM competitor_pages
      WHERE organization_id = current_org_id()
    )
  );
