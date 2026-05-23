-- =============================================================
-- 004_action_placements.sql
-- Multi-placement model.
--
-- An action represents one published piece of content (the article).
-- A piece fans out across channels — the Ghost article, the newsletter,
-- and (later) the LinkedIn / X posts. Each of those is a *placement* that
-- carries its own observable engagement signals and per-channel score
-- suggestions.
--
-- The actions table keeps the operator-CONFIRMED eq_score / cq_score /
-- tas_score. Placements hold the raw signals + auto-SUGGESTED scores that
-- feed those confirmations.
--
-- Why: EQ is the deepest engagement a piece earned on ANY surface; CQ
-- (audience ICP-fit) is sourced from the channel that exposes engager
-- identity — LinkedIn, connected in a later phase. Until then CQ is an
-- honest 'pending', never a fabricated value.
--
-- Additive only: existing rows, seed data and the Actions view are
-- untouched. Run once after 001–003.
-- =============================================================

CREATE TYPE cq_status AS ENUM (
  'pending',      -- the identity-bearing data source is not connected yet
  'available',    -- computed from real engager data
  'unavailable'   -- the source was queried but exposed no usable data
);


-- ---------------------------------------------------------------
-- action_placements
-- One row per (action, channel). The signal store for the loop.
-- ---------------------------------------------------------------
CREATE TABLE action_placements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id         uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  channel           text NOT NULL,   -- 'ghost_article' | 'newsletter' | 'linkedin_personal' | 'linkedin_company' | 'x'

  external_url      text,            -- canonical URL of the placement
  external_id       text,            -- ghost post id, linkedin urn (future)

  -- Raw observable signals. Shape varies by channel; stored verbatim so
  -- scoring logic can evolve without re-fetching.
  metrics           jsonb,

  -- EQ — engagement depth, auto-suggested from observable signals.
  eq_suggested      smallint CHECK (eq_suggested BETWEEN 1 AND 5),
  eq_signal         text,            -- human-readable basis, e.g. 'link clicks present'

  -- CQ — audience ICP-fit. Sourced from identity-rich channels (LinkedIn).
  cq_suggested      smallint CHECK (cq_suggested BETWEEN 1 AND 5),
  cq_status         cq_status NOT NULL DEFAULT 'pending',
  cq_reason         text,            -- why pending/unavailable, or how it was derived
  cq_matched        jsonb,           -- matched engager profiles/domains (future)

  -- MCP fetch tracking, per placement.
  mcp_source        text,
  mcp_fetched_at    timestamptz,
  mcp_fetch_status  mcp_fetch_status NOT NULL DEFAULT 'pending',
  mcp_raw_response  jsonb,
  data_gaps         text[],          -- signals the API could not return (degrade, never fake)

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (action_id, channel)
);

CREATE INDEX action_placements_action_idx  ON action_placements (action_id);
CREATE INDEX action_placements_channel_idx ON action_placements (channel);

CREATE TRIGGER action_placements_updated_at
  BEFORE UPDATE ON action_placements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ---------------------------------------------------------------
-- RLS — gated through the parent action's organization (same pattern
-- as competitor_snapshots). All org members may read + write; deletes
-- follow the parent action via ON DELETE CASCADE.
-- ---------------------------------------------------------------
ALTER TABLE action_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_placements_select" ON action_placements
  FOR SELECT USING (
    action_id IN (SELECT id FROM actions WHERE organization_id = current_org_id())
  );

CREATE POLICY "action_placements_insert" ON action_placements
  FOR INSERT WITH CHECK (
    action_id IN (SELECT id FROM actions WHERE organization_id = current_org_id())
  );

CREATE POLICY "action_placements_update" ON action_placements
  FOR UPDATE USING (
    action_id IN (SELECT id FROM actions WHERE organization_id = current_org_id())
  );

CREATE POLICY "action_placements_delete" ON action_placements
  FOR DELETE USING (
    action_id IN (SELECT id FROM actions WHERE organization_id = current_org_id())
  );
