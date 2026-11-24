-- Scontro a squadre (SPEC §5.19), stage 4: the "match" Edge Function reads the battles and the kits
-- with the service role. 20261124100000_scontro_stage_four.sql took every right on combat_battles
-- away from the clients and gave none to the service role: in this project the service role is
-- granted each table on its own (as the Caccia grossa does), so the function's first read failed.
-- Writes still go only through combat_create and combat_record.
grant select on table public.combat_battles, public.combat_kits to service_role;
