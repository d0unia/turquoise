-- =============================================================
-- 005_attention_model.sql
-- Attention Quotient model (Focus x Intent), replacing EQ x CQ.
--
-- Inspired by McKinsey's "attention equation": value-bearing attention is
-- defined by FOCUS (active vs passive engagement) and INTENT (the job to be
-- done / self-directed pull) — not by reach. Both dimensions are computed
-- from clean, automatically-collectable AGGREGATE signals (counts + rates).
-- No engager identity is required — which is precisely the data LinkedIn
-- gates and we could never collect cleanly.
--
--   Focus  = weighted blend of engagement-depth rates  (per reach)
--   Intent = weighted blend of self-directed-pull rates (per reach)
--   AQ     = Focus x Intent  (0..100). Both must be MEASURED or AQ is held.
--   TAS    = rolling-90-day mean of AQ (portfolio metric).
--
-- Self-calibrating: raw rates are stored on every placement (score_inputs)
-- so the scale can be recalibrated from the publisher's own KPI distribution
-- without re-fetching. Rates stay absolute, so compounding (rising rates)
-- remains visible across recalibrations.
--
-- Additive + non-destructive: the legacy eq_score/cq_score/tas_score columns
-- are left in place (deprecated, unused) so nothing breaks mid-migration.
-- Run once after 001-004.
-- =============================================================

-- ---------------------------------------------------------------
-- Per-placement attention scores
-- ---------------------------------------------------------------
ALTER TABLE action_placements
  ADD COLUMN reach        integer,   -- denominator: impressions / delivered / pageviews
  ADD COLUMN focus_score  numeric,   -- [0,1], null when not measurable
  ADD COLUMN intent_score numeric,   -- [0,1], null when not measurable
  ADD COLUMN aq_score     numeric,   -- focus*intent*100 [0,100]; null unless 'scored'
  ADD COLUMN aq_status    text NOT NULL DEFAULT 'pending'
              CHECK (aq_status IN ('scored', 'partial', 'pending')),
  ADD COLUMN score_inputs jsonb;     -- raw rates + weights/targets used (recompute, never refetch)

-- ---------------------------------------------------------------
-- Action-level rolled-up attention = deepest attention the piece earned
-- on any placement (max of placement aq_score).
-- ---------------------------------------------------------------
ALTER TABLE actions
  ADD COLUMN aq_score numeric;

-- ---------------------------------------------------------------
-- attention_config
-- The attention-cost ladder (weights) + per-channel-class targets.
-- One row per org. Tunable by admins; auto-calibrated as KPIs accrue.
-- ---------------------------------------------------------------
CREATE TABLE attention_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  weights         jsonb NOT NULL,   -- { reaction, open, share, comment, click, search_click, save, signup, conversion }
  targets         jsonb NOT NULL,   -- { social:{focus,intent}, newsletter:{...}, article:{...} }
  calibrated_at   timestamptz,      -- last self-calibration; null = still on defaults
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

CREATE TRIGGER attention_config_updated_at
  BEFORE UPDATE ON attention_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- content_briefs
-- The compound-analysis output + the PRESSROOM-consumable feedback payload.
-- One row per analysis run; the latest per project is the active brief.
-- ---------------------------------------------------------------
CREATE TABLE content_briefs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        uuid REFERENCES projects(id),
  generated_at      timestamptz NOT NULL DEFAULT now(),

  -- Compound analysis (level AND slope per pattern)
  compounding       jsonb,   -- [{ pattern, evidence, trend, hypothesis }]
  underperforming   jsonb,   -- [{ pattern, evidence, question }]
  signals           jsonb,   -- [{ observation, evidence }]
  blind_spots       jsonb,   -- [{ observation }]

  -- The feedback payload PRESSROOM's draft step injects
  amplify           jsonb,   -- angles/topics/formats to amplify
  reduce            jsonb,   -- angles to reduce
  test_next         text,    -- one signal to test
  distribution_note text,    -- note for the distribution layer

  meta              jsonb    -- { actions_analysed, window_days, avg_aq, model_version }
);

CREATE INDEX content_briefs_latest_idx
  ON content_briefs (organization_id, project_id, generated_at DESC);

-- ---------------------------------------------------------------
-- RLS — org-scoped (mirrors channel_configs / actions)
-- ---------------------------------------------------------------
ALTER TABLE attention_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_briefs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attention_config_select" ON attention_config
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "attention_config_write" ON attention_config
  FOR ALL USING (
    organization_id = current_org_id()
    AND current_user_role() = 'admin'
  );

CREATE POLICY "content_briefs_select" ON content_briefs
  FOR SELECT USING (organization_id = current_org_id());

CREATE POLICY "content_briefs_insert" ON content_briefs
  FOR INSERT WITH CHECK (organization_id = current_org_id());

-- ---------------------------------------------------------------
-- Seed the default attention config for the existing org.
-- Weights = attention-cost ladder. Targets = "excellent" raw rates,
-- recalibrated later from the org's own distribution.
-- ---------------------------------------------------------------
INSERT INTO attention_config (organization_id, weights, targets)
SELECT
  id,
  '{
     "reaction": 1, "open": 1, "share": 5, "comment": 6,
     "click": 3, "search_click": 4, "save": 5, "signup": 8, "conversion": 10
   }'::jsonb,
  '{
     "social":     { "focus": 0.06, "intent": 0.03 },
     "newsletter": { "focus": 0.50, "intent": 0.05 },
     "article":    { "focus": 0.40, "intent": 0.10 }
   }'::jsonb
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;
