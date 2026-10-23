"""Run: python -m unittest discover -s backend -v"""

"""    """
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import app


class RatingsTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        app.config.update(TESTING=True, DATABASE=str(Path(self.directory.name) / 'test.db'))
        self.client = app.test_client()

    def tearDown(self):
        self.directory.cleanup()

    @patch('app.tmdb', return_value=({'title': 'Test movie', 'poster_path': None}, None))
    def test_rating_lifecycle_and_persistence(self, mocked_tmdb):
        self.assertEqual(self.client.get('/api/ratings').json, [])
        result = self.client.put('/api/ratings/10', json={'score': 4})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(app.test_client().get('/api/ratings').json[0]['score'], 4)
        self.client.put('/api/ratings/10', json={'score': 2})
        rows = self.client.get('/api/ratings').json
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['score'], 2)
        self.assertEqual(self.client.delete('/api/ratings/10').status_code, 204)
        self.assertEqual(self.client.get('/api/ratings').json, [])
        self.assertEqual(self.client.delete('/api/ratings/10').status_code, 404)

    def test_invalid_scores_and_pages(self):
        for score in [0, 6, 1.5, True, '3', None]:
            self.assertEqual(self.client.put('/api/ratings/1', json={'score': score}).status_code, 400)
        self.assertEqual(self.client.put('/api/ratings/1', json=[]).status_code, 400)
        for page in ['0', '501', 'abc']:
            self.assertEqual(self.client.get(f'/api/movies?page={page}').status_code, 400)

    @patch.dict('os.environ', {'TMDB_API_KEY': '', 'TMDB_ACCESS_TOKEN': ''})
    def test_missing_key(self):
        self.assertEqual(self.client.get('/api/movies').status_code, 503)

    @patch('app.requests.get')
    @patch.dict('os.environ', {'TMDB_API_KEY': 'test', 'TMDB_ACCESS_TOKEN': ''})
    def test_search_parameters(self, get):
        get.return_value.json.return_value = {'results': [], 'total_pages': 0}
        self.assertEqual(self.client.get('/api/movies?query=Matrix&page=2').status_code, 200)
        self.assertEqual(get.call_args.kwargs['params']['query'], 'Matrix')
        self.assertEqual(get.call_args.kwargs['params']['page'], 2)


if __name__ == '__main__':
    unittest.main()
