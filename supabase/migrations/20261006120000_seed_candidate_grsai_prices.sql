-- GrsAI list prices (scraped 2026-10-06 from grsai.com/dashboard/models, CNY) converted at an
-- ASSUMED 0.14 USD per CNY, with a 2.0x customer markup. Every model stays DISABLED, the provider
-- stays disabled with a zero budget, and the service is not accepting requests: these rows only
-- record candidate prices. Limits are conservative placeholders. Video (minimax-h3) is deliberately
-- not priced: OD-007 requires investigation first. Enabling requires verifying cost on a real request.
do $$
declare v_actor constant uuid := '00000000-0000-0000-0000-000000000000';
  v_schema constant jsonb := '{"type":"object","properties":{}}'::jsonb;
  v_note constant text := 'grsai.com/dashboard/models scraped 2026-10-06, CNY list price x 0.14 USD/CNY; unverified against an invoiced request';
begin
  perform public.tw_admin_configure_provider(v_actor, 'seed candidate prices', 'grsai-default', false, 0, 20000, false, 2);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-6-astra', false, 'tokens', 560000, 2800000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-5.6-terra', false, 'tokens', 126000, 728000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-5.6-sol', false, 'tokens', 308000, 1820000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-5.5', false, 'tokens', 308000, 1890000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3.5-flash', false, 'tokens', 168000, 1400000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3.1-flash-lite', false, 'tokens', 35000, 210000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3.5-flash-lite', false, 'tokens', 42000, 350000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3.7-flash', false, 'tokens', 84000, 490000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3.8-flash', false, 'tokens', 84000, 490000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3.1-pro', false, 'tokens', 210000, 980000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3-flash', false, 'tokens', 56000, 420000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-3-pro', false, 'tokens', 210000, 980000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-2.5-flash', false, 'tokens', 42000, 280000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gemini-2.5-pro', false, 'tokens', 175000, 875000, null, null, 200000, 16000, null, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-image-2.5', false, 'request', null, null, 4200, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-image-2.5-sunburst', false, 'request', null, null, 16800, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-image-2.5-flare', false, 'request', null, null, 14000, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-image-2-vip', false, 'request', null, null, 14000, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'gpt-image-2', false, 'request', null, null, 4200, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-pro', false, 'request', null, null, 12600, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-2-lite', false, 'request', null, null, 3080, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-2', false, 'request', null, null, 8400, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-fast', false, 'request', null, null, 3080, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-2-cl', false, 'request', null, null, 42000, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-pro-cl', false, 'request', null, null, 70000, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-2-2k-cl', false, 'request', null, null, 63000, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-pro-4k-vip', false, 'request', null, null, 126000, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-pro-vip', false, 'request', null, null, 70000, null, null, null, 4, v_schema, v_note);
  perform public.tw_admin_configure_model(v_actor, 'seed candidate price', 'nano-banana-2-4k-cl', false, 'request', null, null, 91000, null, null, null, 4, v_schema, v_note);
end $$;
