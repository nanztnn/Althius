begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select plan(2);

-- O Lusha conecta pelo OAuth do servidor MCP e pela chave de API (migration 20261104131000, conector-lusha 02).
select is(
  (select kinds from private.integration_connection_profiles where integration_id = 'lusha'),
  array['oauth_mcp', 'api_key']::text[],
  'o Lusha conecta pela autorização no app e pela chave de API'
);
select is(
  (select pins_portal from private.integration_connection_profiles where integration_id = 'lusha'),
  false,
  'o Lusha continua sem portal fixo'
);

select * from finish();
rollback;
