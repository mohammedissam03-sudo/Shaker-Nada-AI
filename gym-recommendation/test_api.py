
import json
import unittest
from pathlib import Path

from api import app


class TestOptiFitAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        folder = Path(__file__).resolve().parent

        with open(folder / "sample_user.json", encoding="utf-8") as file:
            cls.user = json.load(file)

        with open(folder / "sample_gyms.json", encoding="utf-8") as file:
            cls.gyms = json.load(file)

    def setUp(self):
        self.client = app.test_client()

    def test_health(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "ok")

    def test_valid_recommendation(self):
        response = self.client.post(
            "/recommend",
            json={"user": self.user, "gyms": self.gyms}
        )

        self.assertEqual(response.status_code, 200)

        data = response.get_json()

        self.assertEqual(data["total_gyms"], 3)
        self.assertEqual(data["total_eligible"], 1)

        best_gym = data["recommendations"][0]

        self.assertEqual(best_gym["name"], "Demo Gym A")
        self.assertEqual(best_gym["status"], "eligible")
        self.assertAlmostEqual(best_gym["final_score"], 92.7)

    def test_ineligible_gym(self):
        response = self.client.post(
            "/recommend",
            json={"user": self.user, "gyms": self.gyms}
        )

        data = response.get_json()

        gym_b = next(
            gym for gym in data["other_gyms"]
            if gym["name"] == "Demo Gym B"
        )

        self.assertEqual(gym_b["status"], "ineligible")

    def test_missing_user(self):
        response = self.client.post(
            "/recommend",
            json={"gyms": self.gyms}
        )

        self.assertEqual(response.status_code, 400)

    def test_invalid_gyms(self):
        response = self.client.post(
            "/recommend",
            json={"user": self.user, "gyms": "invalid"}
        )

        self.assertEqual(response.status_code, 400)

    def test_invalid_json(self):
        response = self.client.post(
            "/recommend",
            data="invalid request",
            content_type="text/plain"
        )

        self.assertEqual(response.status_code, 400)

    def test_unverified_gym(self):
        response = self.client.post(
            "/recommend",
            json={"user": self.user, "gyms": self.gyms}
        )

        data = response.get_json()

        gym_c = next(
            gym for gym in data["other_gyms"]
            if gym["name"] == "Demo Gym C"
        )

        self.assertEqual(gym_c["status"], "unverified")
        self.assertIn("facilities", gym_c["missing_data"])


if __name__ == "__main__":
    unittest.main()
