# PixelMovies

Aplicação do teste de estágio: busque filmes no TMDB, consulte sinopse e elenco e mantenha uma coleção de avaliações de 1 a 5 estrelas.

## Tecnologias e decisões

- **React + TypeScript + Vite:** componentes e estado com `useState` e `useEffect`, sem biblioteca extra de estado ou rotas. As duas telas são alternadas pela navegação.
- **Python + Flask:** API pequena, com rotas para filmes e avaliações. A chave TMDB fica no servidor, sem ser enviada ao navegador.
- **SQLite:** banco em arquivo, sem necessidade de instalar um servidor de banco. Uma tabela guarda o ID TMDB, título, pôster e nota. O ID é único para evitar avaliações duplicadas. SQL usa parâmetros.
- **CSS puro:** layout responsivo com a paleta `#0d1b2a`, `#1b263b`, `#415a77`, `#778da9`, `#e0e1dd`.
- As avaliações pertencem a uma **coleção compartilhada da aplicação**. Não há contas ou separação por usuário.
- Título e pôster são armazenados junto da nota para listar avaliações sem fazer uma consulta TMDB para cada filme. Abrir detalhes e salvar uma nota ainda requer TMDB.

## Rodar localmente

Pré-requisitos: Python 3.10+ e Node.js 22.12+ (ou 20.19+).

### Backend (primeiro terminal, a partir da raiz)

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

Edite `backend/.env`. Preencha **TMDB_API_KEY** com a API Key v3 **ou** **TMDB_ACCESS_TOKEN** com o API Read Access Token. Basta uma das opções; o token tem preferência. Não coloque as credenciais no frontend ou no Git.

```powershell
.venv\Scripts\python backend/app.py
```

A API usa `http://localhost:5000`. O banco é criado automaticamente em `backend/movies.db` ao acessar as avaliações. `DATABASE_PATH` permite mudar o caminho; caminhos relativos são relativos ao diretório em que o backend foi iniciado.

### Frontend (segundo terminal)

```powershell
cd frontend
npm install
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://localhost:5173`. O Vite encaminha `/api` para o Flask; não é necessário configurar CORS. Se a porta 5173 estiver ocupada, use o endereço efetivamente impresso no terminal.

Em Linux/macOS, use `.venv/bin/python` e `cp backend/.env.example backend/.env` nos comandos equivalentes.

## Rodar com Docker

Pré-requisito: Docker Desktop instalado e em execução. Na raiz do projeto, copie o modelo de variáveis e preencha uma credencial TMDB:

```powershell
Copy-Item .env.example .env
```

Depois execute:

```powershell
docker compose up --build
```

Abra `http://localhost:8080`. O Nginx serve a interface e encaminha `/api` ao backend. As avaliações ficam no volume Docker `movies_data` e continuam disponíveis após recriar os contêineres. Para encerrar, pressione `Ctrl+C`; para iniciar em segundo plano, acrescente `-d` e use `docker compose down` para parar. O comando `docker compose down -v` também apaga o volume e as avaliações salvas.

## Implementado

- Busca por título no TMDB, com pôster e título nos resultados.
- Filmes populares na tela inicial, antes de buscar.
- Modal com sinopse, data de lançamento, duração, gêneros e até oito nomes do elenco.
- Criar, editar e remover avaliação inteira de 1 a 5, persistida no SQLite.
- Tela de filmes avaliados, com pôster, título e nota; abertura dos detalhes.
- Estados de carregamento, vazio, falha de conexão e chave ausente; nova tentativa.
- Placeholder para pôster inexistente ou imagem que falhou.
- Modal nativo com fechamento por botão, Escape e clique no fundo.
- Layout responsivo, rótulos de campos e botões de estrelas acessíveis por teclado.
- **Bônus:** paginação na busca e nos populares (limite de 500 páginas do TMDB).

## Pendências antes de entregar

- **Credencial TMDB:** fornecer no `.env`, testar busca e detalhes com dados reais. As credenciais não acompanham o projeto.
- Publicar em um **repositório público no GitHub** e enviar o link, conforme o teste. Revisar o que será publicado e manter `.env` fora do Git.
- Autenticação, filtros por gênero/ano e cache de requisições não foram implementados: são bônus, e a prioridade foi o fluxo principal com poucas dependências.

O projeto inclui Dockerfiles e `compose.yaml` para subir a aplicação com um comando. Ainda é necessário conferir a execução em uma máquina com Docker instalado e testar os fluxos TMDB com uma credencial real.

## Verificações

```powershell
.venv\Scripts\python -m unittest discover -s backend -v
cd frontend
npm run build
```

Os testes usam SQLite temporário e simulações do TMDB: verificam persistência, atualização sem duplicação, exclusão, notas inválidas, paginação inválida, ausência de chave e parâmetros de busca. Não substituem o teste com uma credencial real.

Verificação desta versão: quatro testes do backend passaram, TypeScript sem erros e build Vite concluído. A interface inicial, a mensagem de chave ausente e a coleção vazia foram conferidas no navegador. Busca, detalhes e avaliações com TMDB real ainda precisam ser conferidos após configurar a chave.

Checklist manual com os dois servidores e chave configurada:

1. Buscar um título; avançar e voltar páginas; buscar um título inexistente.
2. Abrir detalhes e conferir sinopse, data e elenco; fechar com Escape.
3. Salvar nota 4; conferir em Meus avaliados; recarregar a página e conferir persistência.
4. Editar para 2; remover; conferir que o filme saiu da lista.
5. Testar no celular e desligar o backend para conferir o erro e a nova tentativa.

## Endpoints

| Método | Rota | Função |
|---|---|---|
| GET | `/api/movies?query=matrix&page=1` | Buscar; sem query retorna populares |
| GET | `/api/movies/:id` | Detalhes e elenco |
| GET | `/api/ratings` | Listar avaliações |
| PUT | `/api/ratings/:id` | Criar/editar, JSON `{"score": 4}` |
| DELETE | `/api/ratings/:id` | Excluir avaliação |

O backend valida notas mesmo quando chamadas fora da interface. Requisições TMDB têm timeout de 10 segundos. O servidor Flask incluído é voltado ao desenvolvimento local; um ambiente de produção precisaria de servidor WSGI e proxy apropriados.

## Uso de IA

O ChatGPT/Codex foi utilizado de forma relevante na criação da estrutura, componentes React, estilos, API Flask, testes e documentação. A candidata deve revisar, testar e adaptar o projeto e ser capaz de explicar as decisões e cada fluxo antes de entregar. Atualize esta seção para registrar suas alterações e verificações reais.

## Referências

- [Busca de filmes no TMDB](https://developer.themoviedb.org/reference/search-movie)
- [Detalhes e append_to_response](https://developer.themoviedb.org/reference/movie-details)
- [Autenticação TMDB](https://developer.themoviedb.org/docs/authentication-application)
- [Paleta escolhida](https://coolors.co/palette/0d1b2a-1b263b-415a77-778da9-e0e1dd)

This product uses the TMDB API but is not endorsed or certified by TMDB. Antes da publicação, confira também as regras de atribuição e inclua o logo oficial exigido pelo TMDB.
