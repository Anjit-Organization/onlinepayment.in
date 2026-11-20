-- Custom migration: the current_pricing materialised view. TECHNICAL.md §7.3.
--
-- The calculator and every comparison page need ALL current pricing for ALL
-- gateways at once. Running the temporal join per gateway is wasteful, so this
-- flattens it into one pre-joined relation of a few thousand rows that the
-- calculator loads in a single query per revalidation window.

CREATE MATERIALIZED VIEW "current_pricing" AS
SELECT
  g.id            AS gateway_id,
  g.slug          AS slug,
  g.display_name  AS display_name,
  p.id            AS plan_id,
  p.plan_name     AS plan_name,
  f.method        AS method,
  f.rate_bp       AS rate_bp,
  f.flat_fee_paise,
  f.band_min_paise,
  f.band_max_paise,
  f.gst_applicable,
  rc.setup_fee_paise,
  rc.annual_maintenance_paise,
  rc.monthly_fee_paise,
  rc.platform_fee_bp,
  ot.settlement_cycle_days,
  ot.chargeback_fee_paise,
  ot.mdr_refunded_on_refund,
  p.verified_at,
  p.source_url
FROM gateways g
JOIN pricing_plans p
  ON p.gateway_id = g.id
 AND p.effective_to IS NULL
 AND p.is_default
JOIN fees f
  ON f.plan_id = p.id
LEFT JOIN recurring_costs rc   ON rc.plan_id = p.id
LEFT JOIN operational_terms ot ON ot.plan_id = p.id
WHERE g.status = 'active';
--> statement-breakpoint

-- The UNIQUE index is what makes REFRESH ... CONCURRENTLY possible. Without it
-- every refresh takes an ACCESS EXCLUSIVE lock and blocks all reads.
-- COALESCE because band_min_paise is NULL for untiered fees, and NULLs are not
-- unique-comparable in a unique index.
CREATE UNIQUE INDEX "current_pricing_uq"
  ON "current_pricing" (gateway_id, method, COALESCE(band_min_paise, -1));
--> statement-breakpoint

CREATE INDEX "current_pricing_method_idx" ON "current_pricing" (method);
--> statement-breakpoint

CREATE INDEX "current_pricing_slug_idx" ON "current_pricing" (slug);
