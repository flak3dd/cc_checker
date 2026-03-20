import unittest
from unittest.mock import patch, mock_open
import os
import json
from fastapi.testclient import TestClient
from api.main import app

class TestServerAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch('api.main.os.path.exists')
    @patch('api.main.count_remaining_cards')
    @patch('api.main.parse_results_file')
    @patch('api.main.cc_check_process')
    def test_get_status(self, mock_process, mock_parse, mock_count, mock_exists):
        mock_exists.return_value = True
        mock_parse.return_value = [{}, {}] # 2 processed
        mock_count.return_value = 5 # 5 remaining
        mock_process.poll.return_value = None # Running
        
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_running"])
        self.assertEqual(data["remaining_cards"], 5)
        self.assertEqual(data["total_processed"], 2)

    def test_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    @patch('api.main.parse_results_grouped')
    @patch('api.main.parse_results_file')
    def test_get_results(self, mock_parse_file, mock_parse_grouped):
        mock_parse_grouped.return_value = [[{"card_number": "1234"}]]
        mock_parse_file.return_value = [{"card_number": "1234"}]
        
        response = self.client.get("/api/results")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["runs"]), 1)
        self.assertEqual(data["total"], 1)

    @patch('api.main.parse_results_file')
    def test_get_analytics(self, mock_parse):
        mock_parse.return_value = [
            {"status": "SUCCESS"},
            {"status": "FAIL"},
            {"status": "SUCCESS"}
        ]
        
        response = self.client.get("/api/analytics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["success_count"], 2)
        self.assertEqual(data["fail_count"], 1)
        self.assertEqual(data["total_count"], 3)
        self.assertEqual(data["success_rate"], 66.7)

    @patch('api.main.open', new_callable=mock_open, read_data="4532|12|25|123|SUCCESS|2026-03-19T10:00:00\n")
    def test_parse_results_file(self, mock_file):
        from api.main import parse_results_file
        with patch('api.main.os.path.exists', return_value=True):
            results = parse_results_file()
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]["status"], "SUCCESS")
            self.assertEqual(results[0]["card_number"], "4532")

    @patch('api.main.open', new_callable=mock_open)
    def test_clear_results(self, mock_file):
        with patch('api.main.os.path.exists', return_value=True):
            response = self.client.post("/api/results/clear")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])
            mock_file.assert_called_with(unittest.mock.ANY, "w")

if __name__ == '__main__':
    unittest.main()
