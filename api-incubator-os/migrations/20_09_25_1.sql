
DROP TABLE `form_definitions`, `form_submissions`;

CREATE TABLE forms (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  form_key     VARCHAR(64) NOT NULL,           -- e.g. 'assessment', 'financials'
  title        VARCHAR(255) NOT NULL,
  description  VARCHAR(512) NULL,
  scope_type   ENUM('global','client','program','cohort') NOT NULL DEFAULT 'program',
  scope_id     BIGINT NULL,                    -- FK to categories.id for program/cohort/client
  version      INT NOT NULL DEFAULT 1,         -- bump on publish
  status       ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_form (form_key, scope_type, scope_id, version),
  KEY idx_scope (scope_type, scope_id),
  CONSTRAINT fk_forms_scope FOREIGN KEY (scope_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;




CREATE TABLE form_nodes (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  form_id       BIGINT NOT NULL,
  parent_id     BIGINT NULL,                  -- NULL for tabs (top level)
  depth         TINYINT NOT NULL,             -- 1=tab, 2=section, 3=row, 4=field
  node_type     ENUM('tab','section','row','field') NOT NULL,
  node_key      VARCHAR(64) NOT NULL,         -- stable within its parent (e.g. 'company_profile')
  title         VARCHAR(255) NULL,
  description   VARCHAR(512) NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,

  -- Group/layout settings (for tab/section/row) or field config (for field)
  settings_json JSON NULL,                    -- any extra settings (badges, help blocks, etc)
  layout_class  VARCHAR(255) NULL,            -- Tailwind or custom classes for container/row/field wrapper

  -- Field-only attributes (NULL for non-fields)
  field_type      ENUM('text','textarea','number','email','phone','url','date','dropdown','radio',
                       'checkbox','rating','scale','yesno','file','currency','percentage') NULL,
  placeholder     VARCHAR(255) NULL,
  required        TINYINT(1) NULL,
  default_json    JSON NULL,                  -- scalar/array
  options_json    JSON NULL,                  -- dropdown/radio/checkbox
  validation_json JSON NULL,                  -- min/max/regex
  visibility_json JSON NULL,                  -- conditional show rules
  metric_key      VARCHAR(128) NULL,          -- for analytics (numeric fields)

  -- Normalize NULL parent for unique enforcement on top-level tabs
  parent_norm BIGINT AS (IFNULL(parent_id, 0)) STORED,

  CONSTRAINT fk_fn_form   FOREIGN KEY (form_id)   REFERENCES forms(id)      ON DELETE CASCADE,
  CONSTRAINT fk_fn_parent FOREIGN KEY (parent_id) REFERENCES form_nodes(id) ON DELETE CASCADE,

  -- unique within a parent (works even when parent_id is NULL via parent_norm)
  UNIQUE KEY uq_sibling (form_id, parent_norm, node_key),

  KEY idx_form_depth_parent (form_id, depth, parent_id, sort_order, id),
  KEY idx_type (form_id, node_type),
  KEY idx_metric (metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE form_sessions (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  categories_item_id BIGINT NOT NULL,    -- enrollment (program/cohort/company)
  form_id            BIGINT NOT NULL,    -- points to forms.id (a specific version)
  session_date       DATE NOT NULL,
  status             ENUM('draft','submitted','advisor_verified','program_approved','cancelled')
                       NOT NULL DEFAULT 'draft',
  started_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at       DATETIME NULL,
  verified_by        INT NULL, verified_at DATETIME NULL,
  approved_by        INT NULL, approved_at DATETIME NULL,
  created_by         INT NULL,
  notes              TEXT NULL,
  KEY idx_ci_form_date (categories_item_id, form_id, session_date),
  CONSTRAINT fk_fs_ci   FOREIGN KEY (categories_item_id) REFERENCES categories_item(id) ON DELETE CASCADE,
  CONSTRAINT fk_fs_form FOREIGN KEY (form_id)            REFERENCES forms(id)           ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE session_field_responses (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id    BIGINT NOT NULL,
  field_node_id BIGINT NOT NULL,         -- references a 'field' node in form_nodes
  value_text    TEXT NULL,
  value_num     DECIMAL(18,4) NULL,
  value_date    DATE NULL,
  value_bool    TINYINT(1) NULL,
  value_json    JSON NULL,               -- arrays/multi-selects/etc
  file_url      VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_answer (session_id, field_node_id),
  KEY idx_field_num (field_node_id, value_num),
  KEY idx_field_date (field_node_id, value_date),
  CONSTRAINT fk_sfr_session FOREIGN KEY (session_id)    REFERENCES form_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_sfr_field   FOREIGN KEY (field_node_id) REFERENCES form_nodes(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

