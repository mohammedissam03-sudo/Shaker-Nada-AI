
import json

from main import (
    load_gyms,
    load_user,
    recommend_gyms
)


def main():

    # Load sample data
    user = load_user()
    gyms = load_gyms()

    # Call the recommendation engine
    results = recommend_gyms(user, gyms)

    # Keep only eligible gyms
    eligible_gyms = []

    for gym in results:

        if gym["status"] == "eligible":

            eligible_gyms.append({
                "gym_id": gym["id"],
                "name": gym["name"],
                "final_score": gym["final_score"],
                "coverage": gym["coverage"],
                "status": gym["status"],
                "reasons": gym["reasons"]
            })

    # Prepare JSON output
    response = {
        "total_eligible": len(eligible_gyms),
        "recommendations": eligible_gyms
    }

    print(json.dumps(
        response,
        indent=2,
        ensure_ascii=False
    ))


if __name__ == "__main__":
    main()
