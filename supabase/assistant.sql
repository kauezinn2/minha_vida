-- The browser can issue a temporary code only for its authenticated account.
create table public.minha_vida_pairings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  code uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);
alter table public.minha_vida_pairings enable row level security;
revoke all on public.minha_vida_pairings from public, anon, authenticated;
grant select, insert (user_id), delete on public.minha_vida_pairings to authenticated;
create policy pairing_select on public.minha_vida_pairings for select to authenticated using (user_id=(select auth.uid()));
create policy pairing_insert on public.minha_vida_pairings for insert to authenticated with check (user_id=(select auth.uid()));
create policy pairing_delete on public.minha_vida_pairings for delete to authenticated using (user_id=(select auth.uid()));

create function public.minha_vida_codigo() returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  delete from public.minha_vida_pairings where user_id=auth.uid();
  insert into public.minha_vida_pairings(user_id) values (auth.uid()) returning code into result;
  return result;
end;
$$;
revoke all on function public.minha_vida_codigo() from public, anon;
grant execute on function public.minha_vida_codigo() to authenticated;

create schema minha_vida;
revoke all on schema minha_vida from public, anon, authenticated;
create table minha_vida.vinculo (
  unico boolean primary key default true check(unico),
  user_id uuid not null references auth.users(id) on delete cascade
);
create table minha_vida.operacoes (
  user_id uuid not null references auth.users(id) on delete cascade,
  pedido uuid not null,
  entrada jsonb not null,
  recibo jsonb not null,
  primary key(user_id,pedido)
);
alter table minha_vida.vinculo enable row level security;
alter table minha_vida.operacoes enable row level security;

create function minha_vida.vincular(p_codigo uuid) returns text language plpgsql security invoker set search_path='' as $$
declare dono uuid; atual uuid;
begin
  delete from public.minha_vida_pairings where code=p_codigo and expires_at>now() returning user_id into dono;
  if dono is null then raise exception 'Código inválido ou expirado'; end if;
  insert into minha_vida.vinculo(user_id) values(dono) on conflict (unico) do nothing;
  select user_id into atual from minha_vida.vinculo where unico;
  if atual<>dono then raise exception 'Outra conta já está vinculada'; end if;
  return 'Conta do aplicativo vinculada';
end;
$$;

create function minha_vida.registrar(
  p_pedido uuid, p_modulo text, p_dados jsonb, p_registro uuid default null, p_revisao bigint default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  dono uuid; anterior minha_vida.operacoes%rowtype; entrada jsonb; recibo jsonb;
  categoria text; titulo text; data_local text; tipo text; valor numeric; guardado numeric;
  registro uuid:=coalesce(p_registro,p_pedido); dados jsonb; etapas jsonb; rev bigint;
begin
  select user_id into strict dono from minha_vida.vinculo where unico;
  if p_pedido is null or p_modulo is null or jsonb_typeof(p_dados) is distinct from 'object'
     or (p_registro is null)<>(p_revisao is null) then raise exception 'Pedido inválido'; end if;
  entrada:=jsonb_build_array(p_modulo,p_dados,p_registro,p_revisao);
  perform pg_advisory_xact_lock(hashtextextended(p_pedido::text,0));
  select * into anterior from minha_vida.operacoes where user_id=dono and pedido=p_pedido;
  if found then
    if anterior.entrada<>entrada then raise exception 'Identificador usado para outro pedido'; end if;
    return anterior.recibo;
  end if;
  titulo:=trim(p_dados->>'titulo');
  data_local:=p_dados->>'data';
  if coalesce(length(titulo),0) not between 1 and 100 or data_local is null or data_local !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Informe título e data no formato AAAA-MM-DD'; end if;
  perform data_local::date;
  dados:=jsonb_build_object('id',registro,'title',titulo,'date',data_local);
  tipo:=p_dados->>'tipo';
  case p_modulo
    when 'financas' then
      categoria:='transactions'; valor:=(p_dados->>'valor')::numeric;
      if tipo is null or tipo not in ('Receita','Despesa') or valor is null or not (valor between 0.01 and 999999999)
        or valor<>round(valor,2) or nullif(trim(p_dados->>'categoria'),'') is null or length(p_dados->>'categoria')>60
        or jsonb_typeof(p_dados->'liquidado') is distinct from 'boolean' then raise exception 'Confira tipo, valor, categoria e situação'; end if;
      dados:=dados||jsonb_build_object('type',tipo,'cents',(valor*100)::bigint,'category',trim(p_dados->>'categoria'),'paid',p_dados->'liquidado');
    when 'metas' then
      categoria:='goals'; valor:=coalesce((p_dados->>'valor_alvo')::numeric,0);guardado:=coalesce((p_dados->>'guardado')::numeric,0);
      if tipo is null or tipo not in ('Pessoal','Financeira') or (tipo='Financeira' and valor<=0)
        or not (valor between 0 and 999999999 and guardado between 0 and 999999999)
        or valor<>round(valor,2) or guardado<>round(guardado,2) then raise exception 'Confira o tipo e os valores da meta'; end if;
      etapas:=coalesce(p_dados->'etapas','[]'::jsonb);
      if jsonb_typeof(etapas)<>'array' or jsonb_array_length(etapas)>200 or (tipo='Pessoal' and jsonb_array_length(etapas)=0) then raise exception 'Confira as etapas'; end if;
      if exists(select 1 from jsonb_array_elements(etapas) e where jsonb_typeof(e) is distinct from 'object' or coalesce(length(trim(e->>'titulo')),0) not between 1 and 100 or (e?'feita' and jsonb_typeof(e->'feita')<>'boolean')) then raise exception 'Etapa inválida'; end if;
      select coalesce(jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'title',trim(e->>'titulo'),'done',coalesce(e->'feita','false'::jsonb)) order by n),'[]'::jsonb)
        into etapas from jsonb_array_elements(etapas) with ordinality as t(e,n);
      dados:=dados||jsonb_build_object('type',tipo,'target',(valor*100)::bigint,'current',(guardado*100)::bigint,'priority',coalesce((p_dados->>'prioritaria')::boolean,true),'steps',etapas,'icon','flag');
    when 'agenda' then
      categoria:='events'; tipo:=coalesce(tipo,'Compromisso');
      if tipo not in ('Compromisso','Evento','Prova','Entrega','Lembrete') or coalesce(p_dados->>'hora','') !~ '^($|([01][0-9]|2[0-3]):[0-5][0-9])$' then raise exception 'Confira o tipo e o horário'; end if;
      dados:=dados||jsonb_build_object('type',tipo,'time',coalesce(p_dados->>'hora',''),'place',coalesce(p_dados->>'local',''),'notes',coalesce(p_dados->>'observacoes',''));
    else raise exception 'Módulo desconhecido';
  end case;
  if p_registro is null then
    insert into public.personal_records(user_id,id,kind,payload) values(dono,registro,categoria,dados) returning revision into rev;
  else
    update public.personal_records set payload=dados where user_id=dono and id=registro and kind=categoria and not deleted and revision=p_revisao returning revision into rev;
    if not found then raise exception 'Registro alterado ou excluído. Consulte a versão atual.'; end if;
  end if;
  recibo:=jsonb_build_object('id',registro,'modulo',p_modulo,'titulo',titulo,'data',data_local,'revisao',rev);
  insert into minha_vida.operacoes values(dono,p_pedido,entrada,recibo);
  return recibo;
end;
$$;

create function minha_vida.buscar(p_modulo text,p_titulo text default '') returns table(id uuid,revisao bigint,dados jsonb)
language sql stable security invoker set search_path='' as $$
  select r.id,r.revision,r.payload from public.personal_records r join minha_vida.vinculo v on v.user_id=r.user_id
  where not r.deleted and r.kind=case p_modulo when 'financas' then 'transactions' when 'metas' then 'goals' when 'agenda' then 'events' end
  and position(lower(p_titulo) in lower(r.payload->>'title'))>0
  order by r.payload->>'date' desc,r.id limit 100;
$$;
revoke all on all functions in schema minha_vida from public, anon, authenticated;
comment on schema minha_vida is 'Minha Vida pessoal. Nas conversas com Supabase autorizado, use buscar e registrar somente para pedidos explícitos do titular vinculado.';
comment on function minha_vida.registrar(uuid,text,jsonb,uuid,bigint) is 'Grava na conta pareada. Reutilize p_pedido ao repetir a operação. titulo e data obrigatórios. financas: tipo Receita/Despesa, valor em reais, categoria, liquidado. metas: tipo Financeira/Pessoal, valor_alvo, guardado, etapas [{titulo,feita}], prioritaria. agenda: tipo, hora HH:MM, local, observacoes. Para editar, use o id e revisao de buscar e todos os campos desejados. Retorna recibo depois da gravação.';

