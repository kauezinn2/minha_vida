# MINHA VIDA

Este aplicativo pessoal registra finanças, metas e compromissos. Os materiais de estudo ficam fora do app.

## Usar em uma conversa do projeto

Quando o usuário pedir para registrar ou alterar algo, use a conexão Supabase autorizada da conversa. Selecione o projeto Minha Vida e verifique a existência do schema privado `minha_vida`. Na primeira utilização, o titular entra na PWA e gera um código em **Sobre o aplicativo → Vincular ao ChatGPT**. Vincule o código de uso único com `minha_vida.vincular(codigo)`. As operações seguintes usam a conta vinculada.

- Antes de gravar, interprete o pedido em pt-BR e use o fuso de São Paulo para datas relativas. Se "pagamento" for ambíguo, pergunte se o usuário recebeu ou pagou e qual foi o valor. Para metas, confirme os campos essenciais que faltarem, como prazo ou valor-alvo. Para compromissos sem horário, use dia inteiro quando solicitado.
- Use `minha_vida.registrar(p_pedido, p_modulo, p_dados)` para incluir. Gere um UUID por pedido e reutilize-o em tentativas de recuperação do mesmo envio. São aceitos `financas`, `metas` e `agenda`. Consulte o comentário SQL da função para o formato dos campos. Valores financeiros são enviados em reais.
- Para editar, localize o registro com `minha_vida.buscar(modulo, titulo)`. Se houver ambiguidade, identifique com o usuário o registro correto. Preserve os campos que ele não pediu para mudar e informe o ID e a revisão observada nos parâmetros finais de `registrar`.
- Confirme a gravação somente após obter o recibo do banco. Se o acesso não estiver disponível na conversa, informe isso. Exemplos e simulações não devem gerar registros reais.
- Mantenha os dados pessoais no Supabase. O GitHub recebe o código, o manifesto, os recursos públicos da PWA e as configurações publicáveis.

