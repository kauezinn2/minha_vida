# Minha Vida

Organizador pessoal em português, feito com React, TypeScript, Tailwind CSS e Vite. Início consolida as informações de Finanças, Metas e Agenda.

## Avaliar agora

No pacote de entrega, abra **Minha-Vida.html** no Chrome ou Edge do Windows. A prévia local contém o aplicativo e seus recursos em um único arquivo. Os exemplos são fictícios. Para começar com seus próprios registros, abra **Dados de exemplo → Começar do zero** e confirme. Você também pode manter os exemplos e editá-los.

## Rodar a PWA no Windows

Com Node.js 22.13 ou mais recente e o projeto extraído, execute `node scripts/serve.mjs` na pasta do projeto. Abra **http://127.0.0.1:4173/** no Edge ou Chrome. O pacote já inclui `dist/`, então essa execução dispensa instalação de dependências. O menu de aplicativos do navegador oferece a instalação da PWA. Mantenha a mesma origem para acessar os dados salvos.

## Acessar no iPhone

Hospede o conteúdo de `dist/` na raiz de um domínio HTTPS ou gere um build com VITE_BASE_PATH para publicar em uma subpasta. No iPhone, abra esse endereço no Safari e use **Compartilhar → Adicionar à Tela de Início**. Se aparecer a opção **Abrir como App da Web**, deixe-a ativada. O primeiro carregamento completo prepara a cópia offline. O endereço de loopback do Windows funciona apenas no próprio computador.

## Organização dos dados

- Finanças guarda valores em centavos. O saldo acumulado usa lançamentos pagos ou recebidos até o mês selecionado. Contas pendentes aparecem no mês de vencimento. A baixa usa a data do lançamento. Um relatório mostra os gastos pagos por categoria.
- Metas financeiras usam o valor guardado e o valor-alvo. As pessoais usam a proporção de etapas concluídas. Metas prioritárias em andamento aparecem no painel em ordem de prazo.
- Agenda usa datas locais e permite compromissos com ou sem horário. Lembretes aparecem no calendário e na lista de próximos registros. Esta versão não envia notificações push.
- O navegador persiste os cadastros na chave versionada `minha-vida:v1`. Limpar os dados do navegador também remove os registros. A prévia em arquivo e a PWA servida por HTTP/HTTPS usam armazenamentos independentes.

## Desenvolver e testar

Na pasta do projeto, execute `npm ci` e `npm run dev`. Para gerar a versão instalável, use `npm run build`. Depois do build:

```sh
npm test
node scripts/preview-file.mjs ../outputs/Minha-Vida.html
node tests/interface.mjs
```

Os testes de interface usam o Google Chrome instalado, perfis temporários e larguras de 1440 e 390 pixels. Também é possível fornecer uma URL servida como primeiro argumento de `tests/interface.mjs`.


## Conta, ChatGPT e publicação

O modo local guarda os registros neste navegador. Ao conectar uma conta, o app abre um espaço separado. Em **Sobre o aplicativo**, você pode importar dados pessoais do modo local. Entre com o mesmo e-mail e senha no iPhone e no Windows. Alterações offline ficam na fila do aparelho até a confirmação do banco. Alterações simultâneas no mesmo registro aparecem para revisão nas configurações.

1. No projeto Supabase dedicado, aplique primeiro `supabase/schema.sql` e depois `supabase/assistant.sql`. Use uma chave publicável `sb_publishable_` e a URL do projeto em `src/services/project.json` ou nas variáveis de ambiente do exemplo. Configure o e-mail de autenticação e o endereço de retorno da PWA no painel do Supabase.
2. Para o GitHub Pages, use a branch `main` e **Settings → Pages → Source → GitHub Actions**. O fluxo usa o caminho do repositório ao compilar a PWA. O link publicado aparece no ambiente **github-pages** após a conclusão.
3. Na PWA, clique em **Conectar conta**, confirme o e-mail se solicitado e entre. Abra **Sobre o aplicativo → Vincular ao ChatGPT**. Envie o código de uso único em uma conversa com o Supabase autorizado. A confirmação do banco conclui o vínculo.
4. A partir desse vínculo, peça, por exemplo, “Registre uma despesa de R$ 28 em transporte hoje”. Finanças e Início recebem o lançamento na próxima sincronização, em até 12 segundos enquanto a página está aberta com conexão. Os mesmos comandos estão disponíveis para metas e agenda. O arquivo AGENTS.md descreve como fazer as inclusões e edições pelo conector Supabase em conversas autorizadas.

Os registros do usuário e as credenciais privadas ficam fora do repositório. A autorização da integração pertence à conta do ChatGPT que tem acesso ao projeto Supabase. Em conversas onde essa integração estiver desativada, habilite-a para fazer gravações.
