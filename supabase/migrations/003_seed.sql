-- =============================================================
-- 003_seed.sql
-- Reference data — org, projects, social accounts, channel configs.
-- Run once after 001 + 002, before first user sign-up.
-- =============================================================

-- ---------------------------------------------------------------
-- Organization
-- ---------------------------------------------------------------
INSERT INTO organizations (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Scopelabs', 'scopelabs');


-- ---------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------
INSERT INTO projects (organization_id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Scopelabs',     'scopelabs'),
  ('00000000-0000-0000-0000-000000000001', 'Prompt Ranks',  'promptranks');


-- ---------------------------------------------------------------
-- Social accounts
-- ---------------------------------------------------------------
INSERT INTO social_accounts (organization_id, platform, account_type, display_name, owner) VALUES
  ('00000000-0000-0000-0000-000000000001', 'linkedin', 'personal', 'Cue (personal)',              'cue'),
  ('00000000-0000-0000-0000-000000000001', 'linkedin', 'personal', 'Dounia Beghdadi (personal)',  'dounia'),
  ('00000000-0000-0000-0000-000000000001', 'linkedin', 'personal', 'Adam (personal)',             'adam'),
  ('00000000-0000-0000-0000-000000000001', 'linkedin', 'company',  'Scopelabs (product page)',    null),
  ('00000000-0000-0000-0000-000000000001', 'linkedin', 'company',  'Scopelabs Corp',              null),
  ('00000000-0000-0000-0000-000000000001', 'linkedin', 'company',  'Prompt Ranks',                null),
  ('00000000-0000-0000-0000-000000000001', 'x',        'company',  'Scopelabs X',                 null),
  ('00000000-0000-0000-0000-000000000001', 'x',        'company',  'Prompt Ranks X',              null);


-- ---------------------------------------------------------------
-- Channel configs
-- ---------------------------------------------------------------
INSERT INTO channel_configs (organization_id, channel, mcp_server, measurement_window_days) VALUES
  ('00000000-0000-0000-0000-000000000001', 'linkedin_personal', 'metricool-mcp', 14),
  ('00000000-0000-0000-0000-000000000001', 'linkedin_company',  'metricool-mcp', 14),
  ('00000000-0000-0000-0000-000000000001', 'x',                 'metricool-mcp', 7),
  ('00000000-0000-0000-0000-000000000001', 'ghost_article',     'ghost-mcp',     30),
  ('00000000-0000-0000-0000-000000000001', 'newsletter',        'ghost-mcp',     14),
  ('00000000-0000-0000-0000-000000000001', 'search_console',    'search-console-mcp', 30);
