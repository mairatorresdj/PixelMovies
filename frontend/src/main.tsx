import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

// Tipos dos dados que vêm do TMDB e da coleção.
type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
};

type Rating = {
  movie_id: number;
  title: string;
  poster_path: string | null;
  score: number;
};

type Details = Movie & {
  overview: string;
  runtime: number;
  genres: { id: number; name: string }[];
  credits: {
    cast: { id: number; name: string; character: string }[];
  };
};

type Results = {
  results: Movie[];
  total_pages: number;
  total_results: number;
};

// Centraliza as chamadas da API e as mensagens de erro.
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Não foi possível conectar ao servidor. Tente novamente.');
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

// Se o pôster falhar, a gente mostra um espaço reservado.
function Poster({ movie }: { movie: { title: string; poster_path: string | null } }) {
  const [failed, setFailed] = useState(false);

  return movie.poster_path && !failed ? (
    <img
      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
      alt={`Pôster de ${movie.title}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="no-poster">
      <span aria-hidden="true">▤</span>
      <small>Pôster indisponível</small>
    </div>
  );
}

// O modal busca os detalhes e cuida das avaliações do filme.
function MovieModal({
  id,
  rating,
  onClose,
  onRating,
}: {
  id: number;
  rating?: Rating;
  onClose: () => void;
  onRating: (rating: Rating | null, id: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [movie, setMovie] = useState<Details | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(rating?.score || 0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  // Busca os detalhes ao abrir e cancela a chamada se o modal fechar.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    api<Details>(`/movies/${id}`, { signal: controller.signal })
      .then(setMovie)
      .catch(error => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, attempt]);

  // Salva a nota ou remove a avaliação, conforme a ação escolhida.
  async function save(remove = false) {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const result = await api<Rating>(
        `/ratings/${id}`,
        remove
          ? { method: 'DELETE' }
          : {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ score }),
            },
      );

      onRating(remove ? null : result, id);
      if (remove) setScore(0);
      setNotice(remove ? 'Avaliação removida.' : 'Avaliação salva!');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="movie-title"
    >
      <button className="close" onClick={onClose} aria-label="Fechar detalhes">
        ×
      </button>

      {loading ? (
        <p role="status" className="status">
          Carregando detalhes…
        </p>
      ) : movie ? (
        <div className="details">
          <div className="detail-poster">
            <Poster movie={movie} />
          </div>

          <div>
            <p className="eyebrow">UM FILME, UMA NOVA HISTÓRIA</p>
            <h2 id="movie-title">{movie.title}</h2>
            <p className="muted">
              {movie.release_date
                ? new Date(`${movie.release_date}T12:00:00`).toLocaleDateString('pt-BR')
                : 'Data não informada'}
              {movie.runtime ? ` · ${movie.runtime} min` : ''}
            </p>

            <div className="genres">
              {movie.genres.map(genre => (
                <span key={genre.id}>{genre.name}</span>
              ))}
            </div>

            <h3>Sinopse</h3>
            <p className="synopsis">
              {movie.overview || 'Sinopse ainda não disponível em português.'}
            </p>

            <h3>Elenco principal</h3>
            <p className="cast">
              {movie.credits.cast.slice(0, 8).map(person => person.name).join(' · ') ||
                'Elenco não informado.'}
            </p>

            <section className="rating-box" aria-label="Sua avaliação">
              <h3>{rating ? 'Sua avaliação' : 'O que você achou?'}</h3>
              <p className="muted">Escolha de 1 a 5 estrelas.</p>

              <div className="stars" role="group" aria-label="Nota do filme">
                {[1, 2, 3, 4, 5].map(number => (
                  <button
                    key={number}
                    disabled={saving}
                    aria-label={`${number} ${number === 1 ? 'estrela' : 'estrelas'}`}
                    aria-pressed={score === number}
                    className={number <= score ? 'selected' : ''}
                    onClick={() => {
                      setScore(number);
                      setNotice('');
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="actions">
                <button
                  className="primary"
                  disabled={!score || saving}
                  onClick={() => save()}
                >
                  {saving
                    ? 'Salvando…'
                    : rating
                      ? 'Atualizar avaliação'
                      : 'Salvar avaliação'}
                </button>
                {rating && (
                  <button
                    className="text-button"
                    disabled={saving}
                    onClick={() => save(true)}
                  >
                    Remover avaliação
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="status">
          <h2 id="movie-title">Detalhes indisponíveis</h2>
          <button onClick={() => setAttempt(attempt => attempt + 1)}>
            Tentar novamente
          </button>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </dialog>
  );
}

// A tela principal alterna entre explorar filmes e ver a coleção.
function App() {
  const [tab, setTab] = useState<'search' | 'rated'>('search');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Results>({
    results: [],
    total_pages: 0,
    total_results: 0,
  });
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingsError, setRatingsError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);

  // Carrega as avaliações salvas e atualiza o contador da navegação.
  useEffect(() => {
    const controller = new AbortController();
    setRatingsLoading(true);
    setRatingsError('');

    api<Rating[]>('/ratings', { signal: controller.signal })
      .then(setRatings)
      .catch(error => {
        if (!controller.signal.aborted) setRatingsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRatingsLoading(false);
      });

    return () => controller.abort();
  }, [retry]);

  // A busca de filmes só roda enquanto a aba Explorar está aberta.
  useEffect(() => {
    if (tab !== 'search') return;

    const controller = new AbortController();
    setLoading(true);
    setError('');

    api<Results>(`/movies?query=${encodeURIComponent(query)}&page=${page}`, {
      signal: controller.signal,
    })
      .then(setResults)
      .catch(error => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, page, tab, retry]);

  const visibleMovies: Movie[] =
    tab === 'rated'
      ? ratings.map(rating => ({ ...rating, id: rating.movie_id }))
      : results.results;
  const activeError = tab === 'rated' ? ratingsError : error;
  const activeLoading = tab === 'rated' ? ratingsLoading : loading;

  return (
    <>
      <header>
        <a
          className="brand"
          href="#"
          onClick={event => {
            event.preventDefault();
            setTab('search');
          }}
        >
          <span className="brand-icon" aria-hidden="true">
            ▦
          </span>
          pixel<span>movies</span>
          <span className="brand-dot">.</span>
        </a>

        <nav aria-label="Navegação principal">
          <button
            className={tab === 'search' ? 'active' : ''}
            onClick={() => setTab('search')}
          >
            Explorar
          </button>
          <button
            className={tab === 'rated' ? 'active' : ''}
            onClick={() => setTab('rated')}
          >
            Meus avaliados <span className="badge">{ratings.length}</span>
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">SEU PEQUENO UNIVERSO DE CINEMA</p>
          <h1>
            {tab === 'search' ? (
              <>
                A próxima história
                <br />
                começa <span>aqui.</span>
              </>
            ) : (
              <>
                Filmes que fizeram
                <br />
                <span>parte da sua história.</span>
              </>
            )}
          </h1>
          <p className="intro">
            {tab === 'search'
              ? 'Descubra filmes, conheça o elenco e dê a sua nota. Qual vai ser o de hoje?'
              : 'Cada estrela guarda uma opinião. Reveja e atualize suas avaliações quando quiser.'}
          </p>

          <div className="search-area">
            <label className="search-label" htmlFor="search">
              Pesquisar filmes
            </label>
            <form
              className="search"
              role="search"
              onSubmit={event => {
                event.preventDefault();
                setTab('search');
                setQuery(input.trim());
                setPage(1);
                setRetry(retry => retry + 1);
              }}
            >
              <span aria-hidden="true">⌕</span>
              <input
                id="search"
                type="search"
                placeholder="Digite o nome do filme…"
                aria-describedby="search-help"
                value={input}
                maxLength={200}
                onChange={event => setInput(event.target.value)}
              />
              <button className="primary" type="submit">
                Buscar <span aria-hidden="true">→</span>
              </button>
            </form>
            <p id="search-help" className="search-help">
              Digite um título e pressione Enter ou clique em Buscar.
            </p>
          </div>
        </section>

        <section className="catalog" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {tab === 'rated'
                  ? 'SUA COLEÇÃO'
                  : query
                    ? 'ENCONTRE SUA PRÓXIMA SESSÃO'
                    : 'VALE O PLAY'}
              </p>
              <h2 id="catalog-title">
                {tab === 'rated'
                  ? 'Meus filmes avaliados'
                  : query
                    ? `Resultados para “${query}”`
                    : 'Populares agora'}
              </h2>
            </div>
            <span className="muted">
              {tab === 'rated'
                ? `${ratings.length} avaliados`
                : !loading && !error
                  ? `${results.total_results} filmes`
                  : ''}
            </span>
          </div>

          {tab === 'search' && ratingsError && (
            <p role="alert" className="error">
              Avaliações indisponíveis: {ratingsError}{' '}
              <button onClick={() => setRetry(retry => retry + 1)}>
                Tentar novamente
              </button>
            </p>
          )}

          {activeLoading ? (
            <div className="status" role="status">
              <span className="spinner" />Preparando a sessão…
            </div>
          ) : activeError ? (
            <div className="empty" role="alert">
              <h3>Não conseguimos carregar os filmes</h3>
              <p>{activeError}</p>
              <button onClick={() => setRetry(retry => retry + 1)}>
                Tentar novamente
              </button>
            </div>
          ) : visibleMovies.length === 0 ? (
            <div className="empty">
              <span aria-hidden="true">▤</span>
              <h3>
                {tab === 'rated'
                  ? 'Sua coleção começa com uma estrela'
                  : 'Nenhum filme encontrado'}
              </h3>
              <p>
                {tab === 'rated'
                  ? 'Explore os filmes e salve sua primeira avaliação.'
                  : 'Tente outro título ou confira se o nome está correto.'}
              </p>
              {tab === 'rated' && (
                <button className="primary" onClick={() => setTab('search')}>
                  Explorar filmes
                </button>
              )}
            </div>
          ) : (
            <div className="movie-grid">
              {visibleMovies.map(movie => {
                const rating = ratings.find(rating => rating.movie_id === movie.id);

                return (
                  <button
                    className="movie-card"
                    key={movie.id}
                    onClick={() => setSelected(movie.id)}
                    aria-label={`Ver detalhes de ${movie.title}`}
                  >
                    <div className="poster">
                      <Poster movie={movie} />
                      {rating && <span className="score">★ {rating.score}/5</span>}
                      <span className="poster-action">Ver detalhes ↗</span>
                    </div>
                    <h3>{movie.title}</h3>
                    <p>
                      {tab === 'rated'
                        ? 'Sua avaliação'
                        : movie.release_date?.slice(0, 4) || 'Data não informada'}
                      {tab === 'rated' && (
                        <span className="card-stars">
                          {'★'.repeat(rating?.score || 0)}
                        </span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'search' && !loading && !error && results.total_pages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page => page - 1)}>
                ← Anterior
              </button>
              <span>
                Página {page} de {Math.min(results.total_pages, 500)}
              </span>
              <button
                disabled={page >= Math.min(results.total_pages, 500)}
                onClick={() => setPage(page => page + 1)}
              >
                Próxima →
              </button>
            </div>
          )}
        </section>
      </main>

      <footer>
        <span className="footer-brand">pixelmovies.</span>
        <p>Feito para quem ama uma boa história.</p>
        <p>
          Dados e imagens:{' '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
            TMDB
          </a>. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </footer>

      {selected !== null && (
        <MovieModal
          key={selected}
          id={selected}
          rating={ratings.find(rating => rating.movie_id === selected)}
          onClose={() => setSelected(null)}
          onRating={(rating, id) =>
            setRatings(old =>
              [...old.filter(item => item.movie_id !== id), ...(rating ? [rating] : [])].sort(
                (a, b) => a.title.localeCompare(b.title),
              ),
            )
          }
        />
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
