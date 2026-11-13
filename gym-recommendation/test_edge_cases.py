
import unittest
from copy import deepcopy

from main import (
    load_gyms,
    load_user,
    recommend_gyms,
    calculate_distance,
    calculate_distance_score
)


class TestEdgeCases(unittest.TestCase):

    # Test 1: User without preferences
    def test_no_user_preferences(self):

        user = deepcopy(load_user())

        user["preferred_activities"] = []
        user["preferred_facilities"] = []
        user["required_facilities"] = []
        user["max_distance_km"] = None
        user["available_times"] = {}

        results = recommend_gyms(
            user,
            load_gyms()
        )

        self.assertEqual(len(results), 3)

        for gym in results:
            self.assertIsNone(gym["final_score"])
            self.assertEqual(gym["coverage"], 0.0)

    # Test 2: Invalid coordinates
    def test_invalid_coordinates(self):

        self.assertIsNone(
            calculate_distance(
                95, 35.94, 31.95, 35.93
            )
        )

        self.assertIsNone(
            calculate_distance(
                None, 35.94, 31.95, 35.93
            )
        )

        self.assertIsNone(
            calculate_distance(
                True, 35.94, 31.95, 35.93
            )
        )

    # Test 3: Distance score boundaries
    def test_distance_boundaries(self):

        self.assertEqual(
            calculate_distance_score(0, 5),
            100.0
        )

        self.assertEqual(
            calculate_distance_score(5, 5),
            0.0
        )

        self.assertEqual(
            calculate_distance_score(6, 5),
            0.0
        )

        self.assertIsNone(
            calculate_distance_score(2, 0)
        )


if __name__ == "__main__":
    unittest.main()
