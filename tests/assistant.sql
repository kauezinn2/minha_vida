-- Execute against an isolated PostgreSQL fixture after schema.sql and assistant.sql.
-- The fixture supplies auth.users, auth.uid(), anon and authenticated.
begin;
insert into auth.users (id) values ('f0000000-0000-4000-8000-000000000001');
insert into public.minha_vida_pairings(user_id,code) values ('f0000000-0000-4000-8000-000000000001','f0000000-0000-4000-8000-000000000002');
select minha_vida.vincular('f0000000-0000-4000-8000-000000000002');
do $$
declare p uuid:=gen_random_uuid(); transacao jsonb; original jsonb; alterado jsonb; meta uuid:=gen_random_uuid(); evento uuid:=gen_random_uuid();
begin
  transacao:='{"titulo":"Teste","tipo":"Receita","data":"2026-11-22","valor":42.35,"categoria":"Renda","liquidado":true}';
  original:=minha_vida.registrar(p,'financas',transacao);
  if original is distinct from minha_vida.registrar(p,'financas',transacao) then raise exception 'Falha de repetição'; end if;
  if (select count(*) from minha_vida.buscar('financas','Teste'))<>1 or (select dados->>'cents' from minha_vida.buscar('financas','Teste'))<>'4235' then raise exception 'Receita incorreta'; end if;
  alterado:=minha_vida.registrar(gen_random_uuid(),'financas',transacao||'{"valor":50}',p,1);
  if alterado->>'revisao'<>'2' then raise exception 'Falha na edição'; end if;
  perform minha_vida.registrar(meta,'metas','{"titulo":"Correr","tipo":"Pessoal","data":"2027-01-01","etapas":[{"titulo":"Primeira corrida","feita":false}]}');
  perform minha_vida.registrar(evento,'agenda','{"titulo":"Prova","tipo":"Prova","data":"2026-11-25","hora":"09:30"}');
  if (select dados->'steps'->0->>'title' from minha_vida.buscar('metas','Correr'))<>'Primeira corrida' then raise exception 'Etapas incorretas'; end if;
  if (select dados->>'time' from minha_vida.buscar('agenda','Prova'))<>'09:30' then raise exception 'Horário incorreto'; end if;
  if has_schema_privilege('anon','minha_vida','usage') or has_schema_privilege('authenticated','minha_vida','usage') then raise exception 'Schema do assistente exposto'; end if;
end;
$$;
rollback;

