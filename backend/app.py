import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request

# Lê as configurações locais e prepara o Flask e o caminho do banco.
# No Docker, as mesmas variáveis chegam pelo compose.yaml.
load_dotenv(Path(__file__).with_name('.env'))
app = Flask(__name__)
app.config['DATABASE'] = os.getenv('DATABASE_PATH', str(Path(__file__).with_name('movies.db')))


# Abre o SQLite, garante a tabela de avaliações e fecha a conexão ao terminar.
@contextmanager
def database():
    connection = sqlite3.connect(app.config['DATABASE'])
    connection.row_factory = sqlite3.Row
    connection.execute('''CREATE TABLE IF NOT EXISTS ratings (
        movie_id INTEGER PRIMARY KEY, title TEXT NOT NULL,
        poster_path TEXT, score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5))''')
    try:
        with connection:
            yield connection
    finally:
        connection.close()


# Centraliza as consultas ao TMDB e transforma falhas em respostas da API.
def tmdb(path, **params):
    token = os.getenv('TMDB_ACCESS_TOKEN')
    key = os.getenv('TMDB_API_KEY')
    if not token and not key:
        return None, (jsonify(error='Configure a chave TMDB no arquivo backend/.env.'), 503)
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    if not token:
        params['api_key'] = key
    try:
        response = requests.get(f'https://api.themoviedb.org/3/{path}',
                                params={'language': 'pt-BR', **params}, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json(), None
    except requests.RequestException as error:
        status = getattr(error.response, 'status_code', None)
        message = 'Filme não encontrado.' if status == 404 else 'Não foi possível consultar o TMDB. Confira a chave e tente novamente.'
        return None, (jsonify(error=message), 404 if status == 404 else 502)


@app.get('/api/movies')
def movies():
    # Busca pelo título ou mostra os populares; também limita a paginação aceita.
    query = request.args.get('query', '').strip()
    try:
        page = int(request.args.get('page', 1))
        if not 1 <= page <= 500:
            raise ValueError
    except ValueError:
        return jsonify(error='Página inválida.'), 400
    path = 'search/movie' if query else 'movie/popular'
    params = {'page': page, 'include_adult': 'false'}
    if query:
        params['query'] = query
    data, error = tmdb(path, **params)
    return error if error else jsonify(data)


@app.get('/api/movies/<int:movie_id>')
def movie(movie_id):
    # Retorna os detalhes do filme junto com os créditos do elenco.
    data, error = tmdb(f'movie/{movie_id}', append_to_response='credits')
    return error if error else jsonify(data)


@app.get('/api/ratings')
def ratings():
    # Lista a coleção salva no SQLite em ordem alfabética.
    with database() as connection:
        rows = connection.execute('SELECT * FROM ratings ORDER BY title COLLATE NOCASE').fetchall()
    return jsonify([dict(row) for row in rows])


@app.put('/api/ratings/<int:movie_id>')
def save_rating(movie_id):
    # Valida a nota e busca os dados oficiais do filme antes de salvar.
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or type(body.get('score')) is not int or not 1 <= body['score'] <= 5:
        return jsonify(error='A nota deve ser um número inteiro de 1 a 5.'), 400
    # Usa os dados do TMDB para não depender do título ou pôster enviado pelo navegador.
    data, error = tmdb(f'movie/{movie_id}')
    if error:
        return error
    with database() as connection:
        connection.execute('''INSERT INTO ratings(movie_id, title, poster_path, score) VALUES (?, ?, ?, ?)
            ON CONFLICT(movie_id) DO UPDATE SET score=excluded.score,
            title=excluded.title, poster_path=excluded.poster_path''',
            (movie_id, data['title'], data.get('poster_path'), body['score']))
    return jsonify(movie_id=movie_id, title=data['title'], poster_path=data.get('poster_path'), score=body['score'])


@app.delete('/api/ratings/<int:movie_id>')
def delete_rating(movie_id):
    # Remove a avaliação e avisa quando esse filme não estava na coleção.
    with database() as connection:
        result = connection.execute('DELETE FROM ratings WHERE movie_id = ?', (movie_id,))
    if not result.rowcount:
        return jsonify(error='Avaliação não encontrada.'), 404
    return '', 204


if __name__ == '__main__':
    # Permite acessar a API pela rede local e pelos outros contêineres.
    app.run(host='0.0.0.0', port=5000)
