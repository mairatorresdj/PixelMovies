# PixelMovies

Um cantinho para descobrir filmes, ver detalhes e guardar suas avaliações de 1 a 5 estrelas. Os dados dos filmes vêm da API do TMDB.

## Como rodar com Docker

Você precisa ter o Docker Desktop instalado e aberto. Na pasta principal do projeto, crie seu arquivo de configuração:

```powershell
Copy-Item .env.example .env
```

Abra o `.env` e preencha **uma** das credenciais do TMDB (`TMDB_API_KEY` ou `TMDB_ACCESS_TOKEN`). Depois, inicie o projeto:

```powershell
docker compose up --build
```

Acesse [http://localhost:8080](http://localhost:8080). Para encerrar, pressione `Ctrl+C` no terminal. As avaliações ficam em um volume do Docker e continuam salvas. O arquivo `.env` é local e não deve ser enviado ao GitHub.

## Como rodar localmente, sem Docker

Você vai precisar de Python 3.10+ e Node.js 20.19+ (ou 22.12+).

No primeiro terminal, na pasta principal do projeto, instale e inicie o backend:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Preencha uma das credenciais do TMDB em `backend/.env` e rode:

```powershell
.venv\Scripts\python.exe backend\app.py
```

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abra o endereço que o Vite mostrar, normalmente [http://localhost:5173](http://localhost:5173).

## O que o teste pedia e já está feito

- Busca de filmes no TMDB, com pôster e título; a página inicial também mostra filmes populares.
- Ao clicar num filme, abre uma janela com sinopse, data de lançamento, duração, gêneros e elenco.
- Dá para avaliar de 1 a 5 estrelas, editar a nota e remover a avaliação.
- A página **Meus avaliados** mostra os filmes, pôsteres e notas; clicar abre os detalhes.
- A API é feita em Python com Flask e as avaliações ficam salvas no SQLite.
- A interface mostra estados de carregamento, listas vazias e mensagens de erro.
- O projeto roda com um comando Docker, como pede o teste. A busca tem paginação, que é um bônus.

## O que ficou de fora

- Filtros por gênero ou ano, autenticação e cache. São recursos bônus e não foram implementados.
- O site não foi publicado num serviço de hospedagem; a entrega é o repositório público do GitHub e a execução local pelo Docker.
- Falta conferir a atribuição do TMDB e incluir o logo oficial exigido por eles; também falta colocar no site o crédito do ícone da Flaticon.

Para usar a busca, é preciso configurar uma credencial TMDB no `.env`. Ela não acompanha o projeto nem deve ser publicada.

## Uso de IA

Usei ChatGPT/Codex como apoio na criação e organização do código, na documentação e na configuração do Docker. Revisei e adaptei o projeto e estou conferindo os fluxos antes da entrega.

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
