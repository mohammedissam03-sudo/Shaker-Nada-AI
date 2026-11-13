
import json
import math
import re
from pathlib import Path


# ==========================================
# OPTIFIT - GYM RECOMMENDATION SYSTEM
# ==========================================

WEIGHTS = {
    "activities": 0.35,
    "facilities": 0.25,
    "distance": 0.25,
    "time": 0.15
}


# ==========================================
# 1. LOAD DATA
# ==========================================

def load_gyms():
    path = Path(__file__).parent / "sample_gyms.json"

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def load_user():
    path = Path(__file__).parent / "sample_user.json"

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


# ==========================================
# 2. ACTIVITY MATCHING - 35%
# ==========================================

def calculate_activity_score(preferred, available):

    if not preferred or available is None:
        return None

    preferred_set = set(preferred)
    available_set = set(available)

    matched = preferred_set.intersection(available_set)

    return round(
        len(matched) / len(preferred_set) * 100, 2
    )


# ==========================================
# 3. FACILITIES MATCHING - 25%
# ==========================================

def calculate_facility_score(preferred, available):

    if not preferred or available is None:
        return None

    preferred_set = set(preferred)
    available_set = set(available)

    matched = preferred_set.intersection(available_set)

    return round(
        len(matched) / len(preferred_set) * 100, 2
    )


# ==========================================
# 4. HAVERSINE DISTANCE
# ==========================================

def calculate_distance(
    lat1, lon1, lat2, lon2,
    round_result=True
):

    coordinates = [lat1, lon1, lat2, lon2]

    if any(
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        for value in coordinates
    ):
        return None

    if not (-90 <= lat1 <= 90 and -90 <= lat2 <= 90):
        return None

    if not (-180 <= lon1 <= 180 and -180 <= lon2 <= 180):
        return None

    lat1, lon1, lat2, lon2 = map(
        math.radians, coordinates
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    a = max(0.0, min(1.0, a))

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    distance = 6371.0 * c

    if round_result:
        return round(distance, 2)

    return distance


# ==========================================
# 5. DISTANCE MATCHING - 25%
# ==========================================

def calculate_distance_score(distance, max_distance):

    if distance is None or max_distance is None:
        return None

    if (
        isinstance(distance, bool)
        or isinstance(max_distance, bool)
        or not isinstance(distance, (int, float))
        or not isinstance(max_distance, (int, float))
    ):
        return None

    if not (
        math.isfinite(distance)
        and math.isfinite(max_distance)
    ):
        return None

    if distance < 0 or max_distance <= 0:
        return None

    score = (1 - distance / max_distance) * 100

    return round(max(0, min(100, score)), 2)


# ==========================================
# 6. TIME CONVERSION
# ==========================================

def time_to_minutes(value):

    if not isinstance(value, str):
        return None

    if not re.fullmatch(r"\d{2}:\d{2}", value):
        return None

    hours, minutes = map(int, value.split(":"))

    if hours > 23 or minutes > 59:
        return None

    return hours * 60 + minutes


# ==========================================
# 7. OPENING HOURS MATCHING - 15%
# ==========================================

def calculate_time_score(available_times, opening_hours):

    if not available_times:
        return None

    if not isinstance(available_times, dict):
        return None

    if not isinstance(opening_hours, dict):
        return None

    total_available = 0
    total_overlap = 0

    for day, user_time in available_times.items():

        gym_time = opening_hours.get(day)

        if not isinstance(user_time, dict):
            return None

        if not isinstance(gym_time, dict):
            return None

        user_start = time_to_minutes(
            user_time.get("start")
        )

        user_end = time_to_minutes(
            user_time.get("end")
        )

        gym_open = time_to_minutes(
            gym_time.get("open")
        )

        gym_close = time_to_minutes(
            gym_time.get("close")
        )

        if None in (
            user_start, user_end,
            gym_open, gym_close
        ):
            return None

        # Same-day intervals only
        if user_start >= user_end or gym_open >= gym_close:
            return None

        available = user_end - user_start

        overlap = max(
            0,
            min(user_end, gym_close)
            - max(user_start, gym_open)
        )

        total_available += available
        total_overlap += overlap

    if total_available == 0:
        return None

    return round(
        total_overlap / total_available * 100, 2
    )


# ==========================================
# 8. FINAL MATCHING SCORE
# ==========================================

def calculate_final_score(scores, user):

    requested = {
        "activities": bool(
            user.get("preferred_activities")
        ),
        "facilities": bool(
            user.get("preferred_facilities")
        ),
        "distance": (
            user.get("max_distance_km") is not None
        ),
        "time": bool(
            user.get("available_times")
        )
    }

    active_weight = sum(
        WEIGHTS[key]
        for key in WEIGHTS
        if requested[key]
    )

    if active_weight == 0:
        return None, 0.0

    weighted_sum = 0
    known_weight = 0

    for criterion, weight in WEIGHTS.items():

        if not requested[criterion]:
            continue

        score = scores.get(criterion)

        if score is None:
            continue

        weighted_sum += score * weight
        known_weight += weight

    final_score = weighted_sum / active_weight

    coverage = known_weight / active_weight * 100

    return (
        round(final_score, 2),
        round(coverage, 2)
    )


# ==========================================
# 9. MANDATORY FACILITIES
# ==========================================

def check_required_facilities(user, gym):

    required = user.get("required_facilities") or []

    if not isinstance(required, list):
        raise ValueError(
            "required_facilities must be a list"
        )

    if not required:
        return "eligible", []

    available = gym.get("facilities")

    if available is None:
        return "unverified", [
            "Gym facilities are unknown; "
            "mandatory requirements cannot be verified"
        ]

    if not isinstance(available, list):
        return "unverified", [
            "Gym facilities data is invalid"
        ]

    missing = sorted(
        set(required) - set(available)
    )

    if missing:
        return "ineligible", [
            "Missing required facilities: "
            + ", ".join(missing)
        ]

    return "eligible", []


# ==========================================
# 10. MANDATORY DISTANCE - NEW
# ==========================================

def check_required_distance(user, distance):

    # Distance is only a preference
    if user.get("require_max_distance") is not True:
        return "eligible", []

    max_distance = user.get("max_distance_km")

    # Validate maximum allowed distance
    if (
        isinstance(max_distance, bool)
        or not isinstance(max_distance, (int, float))
        or not math.isfinite(max_distance)
        or max_distance <= 0
    ):
        return "unverified", [
            "Valid maximum distance is required"
        ]

    # Unknown user or gym coordinates
    if distance is None:
        return "unverified", [
            "Distance is unknown; "
            "mandatory distance cannot be verified"
        ]

    # Gym exceeds mandatory distance
    if distance > max_distance:
        return "ineligible", [
            f"Gym is {distance:.2f} km away, "
            f"exceeding the maximum {max_distance} km"
        ]

    return "eligible", []


# ==========================================
# 11. COMBINE MANDATORY CONSTRAINTS - NEW
# ==========================================

def check_mandatory_constraints(user, gym, distance):

    facility_status, facility_reasons = (
        check_required_facilities(user, gym)
    )

    distance_status, distance_reasons = (
        check_required_distance(user, distance)
    )

    reasons = facility_reasons + distance_reasons

    # A confirmed violation always excludes the gym
    if (
        facility_status == "ineligible"
        or distance_status == "ineligible"
    ):
        return "ineligible", reasons

    # Unknown mandatory requirement
    if (
        facility_status == "unverified"
        or distance_status == "unverified"
    ):
        return "unverified", reasons

    return "eligible", []


# ==========================================
# 12. EXPLAINABLE RECOMMENDATIONS
# ==========================================

def generate_explanation(user, gym, scores, distance):

    reasons = []
    missing_data = []

    if scores["activities"] is not None:

        matched = sorted(
            set(user.get("preferred_activities") or [])
            & set(gym.get("activities") or [])
        )

        if matched:
            reasons.append(
                "Matches your preferred activities: "
                + ", ".join(matched)
            )

    elif user.get("preferred_activities"):
        missing_data.append("activities")

    if scores["facilities"] is not None:

        matched = sorted(
            set(user.get("preferred_facilities") or [])
            & set(gym.get("facilities") or [])
        )

        if matched:
            reasons.append(
                "Provides your requested facilities: "
                + ", ".join(matched)
            )

    elif user.get("preferred_facilities"):
        missing_data.append("facilities")

    max_distance = user.get("max_distance_km")

    if scores["distance"] is not None:

        if distance <= max_distance:
            reasons.append(
                f"Located {distance} km away, "
                f"within your preferred {max_distance} km"
            )

    elif max_distance is not None:
        missing_data.append("distance")

    if scores["time"] is not None:

        if scores["time"] == 100:
            reasons.append(
                "Open during all your preferred training hours"
            )

        elif scores["time"] > 0:
            reasons.append(
                "Open during part of your preferred training hours"
            )

    elif user.get("available_times"):
        missing_data.append("opening hours")

    return reasons, missing_data


# ==========================================
# 13. RECOMMENDATION ENGINE
# ==========================================

def recommend_gyms(user, gyms):

    results = []
    location = user.get("location") or {}

    for gym in gyms:

        activity_score = calculate_activity_score(
            user.get("preferred_activities"),
            gym.get("activities")
        )

        facility_score = calculate_facility_score(
            user.get("preferred_facilities"),
            gym.get("facilities")
        )

        # Calculate precise distance for mandatory checks
        precise_distance = calculate_distance(
            location.get("latitude"),
            location.get("longitude"),
            gym.get("latitude"),
            gym.get("longitude"),
            round_result=False
        )

        # Rounded distance for display and scoring
        distance = (
            round(precise_distance, 2)
            if precise_distance is not None
            else None
        )

        distance_score = calculate_distance_score(
            distance,
            user.get("max_distance_km")
        )

        time_score = calculate_time_score(
            user.get("available_times"),
            gym.get("opening_hours")
        )

        scores = {
            "activities": activity_score,
            "facilities": facility_score,
            "distance": distance_score,
            "time": time_score
        }

        final_score, coverage = calculate_final_score(
            scores, user
        )

        reasons, missing_data = generate_explanation(
            user, gym, scores, distance
        )

        status, constraint_reasons = (
            check_mandatory_constraints(
                user, gym, precise_distance
            )
        )

        results.append({
            "id": gym.get("id"),
            "name": gym.get("name"),
            "distance_km": distance,
            "scores": scores,
            "final_score": final_score,
            "coverage": coverage,
            "reasons": reasons,
            "missing_data": missing_data,
            "status": status,
            "constraint_reasons": constraint_reasons
        })

    # Ranking by matching score
    ranked_gyms = sorted(
        results,
        key=lambda gym: (
            gym["final_score"] is not None,
            gym["final_score"]
            if gym["final_score"] is not None
            else -1,
            gym["coverage"]
        ),
        reverse=True
    )

    return ranked_gyms


# ==========================================
# 14. MAIN PROGRAM
# ==========================================

def main():

    print("=" * 45)
    print("OPTIFIT - GYM RECOMMENDATION SYSTEM")
    print("=" * 45)

    gyms = load_gyms()
    user = load_user()

    print(f"\nTotal gyms loaded: {len(gyms)}")

    ranked_gyms = recommend_gyms(user, gyms)

    eligible_gyms = [
        gym for gym in ranked_gyms
        if gym["status"] == "eligible"
    ]

    other_gyms = [
        gym for gym in ranked_gyms
        if gym["status"] != "eligible"
    ]

    print("\nELIGIBLE GYM RECOMMENDATIONS")
    print("=" * 45)

    if not eligible_gyms:
        print("No gyms meet all mandatory requirements.")

    for rank, gym in enumerate(eligible_gyms, start=1):

        print(f"\nRank #{rank}")
        print(f"Gym: {gym['name']}")
        print(f"Status: {gym['status']}")

        if gym["final_score"] is None:
            print("Final Score: Not evaluated")
        else:
            print(f"Final Score: {gym['final_score']}/100")

        print(f"Data Coverage: {gym['coverage']}%")

        print("\nWhy this gym?")

        if gym["reasons"]:
            for reason in gym["reasons"]:
                print(f"  + {reason}")
        else:
            print("  No confirmed preference matches.")

        if gym["missing_data"]:
            print(
                "\nMissing data: "
                + ", ".join(gym["missing_data"])
            )

        print("-" * 45)

    print("\nOTHER GYMS - NOT RECOMMENDED")
    print("=" * 45)

    if not other_gyms:
        print("No excluded or unverified gyms.")

    for gym in other_gyms:

        print(f"\nGym: {gym['name']}")
        print(f"Status: {gym['status']}")

        for reason in gym["constraint_reasons"]:
            print(f"Reason: {reason}")

        print("-" * 45)


if __name__ == "__main__":
    main()
