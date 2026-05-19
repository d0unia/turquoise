-- =============================================================
-- 001_initial_schema.sql
-- Turquoise — full initial schema
-- Run once against a fresh Supabase project.
-- =============================================================

-- ---------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------
CREATE TYPE action_status AS ENUM (
  'active',
  'pending_review',
  'measured',
  'untracked'
);

CREATE TYPE mcp_fetch_status AS ENUM (
  'pending',
  'fetched',
  'failed',
  'skipped'
);


-- ---------------------------------------------------------------
-- organizations
-- One row per workspace (Scopelabs org).
-- ---------------------------------------------------------------
CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------
-- projects
-- Scopelabs | Prompt Ranks — separate project scopes.
-- ---------------------------------------------------------------
CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);


-- ---------------------------------------------------------------
-- social_accounts
-- All LinkedIn + X accounts in scope for Metricool MCP routing.
-- ---------------------------------------------------------------
CREATE TABLE social_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform        text NOT NULL,        -- 'linkedin' | 'x'
  account_type    text NOT NULL,        -- 'personal' | 'company'
  display_name    text NOT NULL,
  owner           text,                 -- 'cue' | 'dounia' | 'adam' | null
  platform_id     text,
  metricool_id    text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------
-- channel_configs
-- Per-channel MCP routing + measurement window settings.
-- ---------------------------------------------------------------
CREATE TABLE channel_configs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel                 text NOT NULL,   -- 'linkedin_personal' | 'linkedin_company' | 'x' | 'ghost' | 'newsletter'
  mcp_server              text NOT NULL,
  measurement_window_days integer NOT NULL DEFAULT 14,
  is_active               boolean NOT NULL DEFAULT true,
  config                  jsonb,
  project_id              uuid REFERENCES projects(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, channel)
);


-- ---------------------------------------------------------------
-- actions
-- Core table. One row per published content unit.
-- ---------------------------------------------------------------
CREATE TABLE actions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id         uuid REFERENCES projects(id),
  social_account_id  uuid REFERENCES social_accounts(id),

  -- Content
  title              text NOT NULL,
  channel            text NOT NULL,
  action_date        date NOT NULL DEFAULT current_date,
  notes              text,

  -- Workflow
  status             action_status NOT NULL DEFAULT 'active',

  -- TAS scoring (set by Cue at log time, refined at review)
  eq_score           smallint CHECK (eq_score BETWEEN 1 AND 5),
  cq_score           smallint CHECK (cq_score BETWEEN 1 AND 5),
  tas_score          smallint GENERATED ALWAYS AS (
                       CASE WHEN eq_score IS NOT NULL AND cq_score IS NOT NULL
                         THEN eq_score * cq_score
                         ELSE NULL
                       END
                     ) STORED,

  -- Measurement (pre-filled by MCP, confirmed by Cue)
  metric_value_draft numeric,
  outcome_draft      text,
  window_closed_at   timestamptz,

  -- MCP fetch tracking
  mcp_source         text,
  mcp_fetched_at     timestamptz,
  mcp_fetch_status   mcp_fetch_status DEFAULT 'pending',
  mcp_raw_response   jsonb,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX actions_org_date_idx ON actions (organization_id, action_date DESC);
CREATE INDEX actions_project_idx  ON actions (project_id);
CREATE INDEX actions_status_idx   ON actions (status);


-- ---------------------------------------------------------------
-- competitor_pages
-- Manually declared URLs to monitor weekly.
-- ---------------------------------------------------------------
CREATE TABLE competitor_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url             text NOT NULL,
  company_name    text NOT NULL,
  product         text NOT NULL CHECK (product IN ('scopelabs', 'promptranks', 'both')),
  category        text NOT NULL CHECK (category IN ('competitor', 'benchmark', 'inspiration')),
  is_active       boolean NOT NULL DEFAULT true,
  project_id      uuid REFERENCES projects(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, url)
);


-- ---------------------------------------------------------------
-- competitor_snapshots
-- Weekly diffs stored per page.
-- ---------------------------------------------------------------
CREATE TABLE competitor_snapshots (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_page_id uuid NOT NULL REFERENCES competitor_pages(id) ON DELETE CASCADE,
  fetched_at         timestamptz NOT NULL DEFAULT now(),
  title              text,
  meta_description   text,
  h1                 text,
  h2s                text[],
  word_count         integer,
  has_changed        boolean NOT NULL DEFAULT false,
  diff_summary       text,
  raw_html_hash      text
);

CREATE INDEX snapshots_page_idx ON competitor_snapshots (competitor_page_id, fetched_at DESC);


-- ---------------------------------------------------------------
-- updated_at trigger (shared)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER actions_updated_at
  BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------
-- Archive trigger
-- Keeps only the 30 most recent non-untracked actions per org.
-- Fires after each INSERT on actions.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION archive_old_actions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE actions
  SET status = 'untracked'
  WHERE id IN (
    SELECT id
    FROM   actions
    WHERE  organization_id = NEW.organization_id
      AND  status <> 'untracked'
    ORDER  BY action_date DESC, created_at DESC
    OFFSET 30
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_action_window
  AFTER INSERT ON actions
  FOR EACH ROW EXECUTE FUNCTION archive_old_actions();
