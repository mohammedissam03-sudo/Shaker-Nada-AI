
import unittest
from copy import deepcopy

from main import (
    load_gyms,
    load_user,
    recommend_gyms,
    check_required_distance,
    check_mandatory_constraints
)


class TestGymRecommendation(unittest.TestCase):

    def setUp(self):
        self.gyms = load_gyms()
        self.user = load_user()

        self.results = recommend_gyms(
            self.user,
            self.gyms
        )

        self.by_name = {
            gym["name"]: gym
            for gym in self.results
        }

    # Test 1: Ranking
    def test_ranking(self):
        names = [
            gym["name"]
            for gym in self.results
        ]

        self.assertEqual(
            names,
            ["Demo Gym A", "Demo Gym B", "Demo Gym C"]
        )

    # Test 2: Final Scores
    def test_final_scores(self):
        self.assertEqual(
            self.by_name["Demo Gym A"]["final_score"],
            92.7
        )

        self.assertEqual(
            self.by_name["Demo Gym B"]["final_score"],
            56.87
        )

    # Test 3: Missing Data
    def test_missing_data(self):
        gym_c = self.by_name["Demo Gym C"]

        self.assertEqual(
            gym_c["coverage"],
            35.0
        )

        self.assertIn(
            "facilities",
            gym_c["missing_data"]
        )

        self.assertIn(
            "distance",
            gym_c["missing_data"]
        )

    # Test 4: Mandatory Statuses
    def test_mandatory_statuses(self):
        self.assertEqual(
            self.by_name["Demo Gym A"]["status"],
            "eligible"
        )

        self.assertEqual(
            self.by_name["Demo Gym B"]["status"],
            "ineligible"
        )

        self.assertEqual(
            self.by_name["Demo Gym C"]["status"],
            "unverified"
        )

    # Test 5: Missing Required Pool
    def test_missing_required_pool(self):
        reasons = self.by_name[
            "Demo Gym B"
        ]["constraint_reasons"]

        self.assertIn(
            "Missing required facilities: pool",
            reasons
        )

    # Test 6: Unknown Facilities
    def test_unknown_facilities(self):
        gym_c = self.by_name["Demo Gym C"]

        self.assertEqual(
            gym_c["status"],
            "unverified"
        )

    # Test 7: Remove Pool Requirement Only
    def test_no_mandatory_facilities(self):
        user = deepcopy(self.user)

        user["required_facilities"] = []

        results = recommend_gyms(user, self.gyms)

        statuses = {
            gym["name"]: gym["status"]
            for gym in results
        }

        self.assertEqual(
            statuses["Demo Gym A"],
            "eligible"
        )

        self.assertEqual(
            statuses["Demo Gym B"],
            "eligible"
        )

        # Distance is still mandatory
        self.assertEqual(
            statuses["Demo Gym C"],
            "unverified"
        )

    # Test 8: Remove All Mandatory Requirements
    def test_no_mandatory_constraints(self):
        user = deepcopy(self.user)

        user["required_facilities"] = []
        user["require_max_distance"] = False

        results = recommend_gyms(user, self.gyms)

        for gym in results:
            self.assertEqual(
                gym["status"],
                "eligible"
            )

    # Test 9: Gym Within Distance Limit
    def test_distance_within_limit(self):
        status, reasons = check_required_distance(
            self.user,
            3.0
        )

        self.assertEqual(status, "eligible")
        self.assertEqual(reasons, [])

    # Test 10: Gym Beyond Distance Limit
    def test_distance_exceeded(self):
        status, reasons = check_required_distance(
            self.user,
            8.0
        )

        self.assertEqual(status, "ineligible")
        self.assertTrue(reasons)

    # Test 11: Unknown Distance
    def test_unknown_distance(self):
        status, reasons = check_required_distance(
            self.user,
            None
        )

        self.assertEqual(status, "unverified")
        self.assertTrue(reasons)

    # Test 12: Exact Distance Boundary
    def test_distance_boundary(self):
        status_at_limit, _ = check_required_distance(
            self.user,
            5.0
        )

        status_over_limit, _ = check_required_distance(
            self.user,
            5.00001
        )

        self.assertEqual(
            status_at_limit,
            "eligible"
        )

        self.assertEqual(
            status_over_limit,
            "ineligible"
        )

    # Test 13: Confirmed Violation Takes Priority
    def test_violation_priority(self):
        gym_b = deepcopy(self.gyms[1])

        status, reasons = check_mandatory_constraints(
            self.user,
            gym_b,
            None
        )

        self.assertEqual(status, "ineligible")

        self.assertIn(
            "Missing required facilities: pool",
            reasons
        )


if __name__ == "__main__":
    unittest.main()
