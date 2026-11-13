
from flask import Flask, request, jsonify
from main import recommend_gyms

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "OptiFit Gym Recommendation API"
    })


@app.post("/recommend")
def recommend():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Request body must be a JSON object."
        }), 400

    user = data.get("user")
    gyms = data.get("gyms")

    if not isinstance(user, dict):
        return jsonify({
            "error": "user must be a JSON object."
        }), 400

    if not isinstance(gyms, list) or not all(
        isinstance(gym, dict) for gym in gyms
    ):
        return jsonify({
            "error": "gyms must be a list of JSON objects."
        }), 400

    try:
        results = recommend_gyms(user, gyms)
    except (ValueError, TypeError, KeyError) as error:
        return jsonify({
            "error": str(error)
        }), 400

    eligible = [
        gym for gym in results
        if gym["status"] == "eligible"
    ]

    other_gyms = [
        gym for gym in results
        if gym["status"] != "eligible"
    ]

    return jsonify({
        "total_gyms": len(results),
        "total_eligible": len(eligible),
        "recommendations": eligible,
        "other_gyms": other_gyms
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5001,
        debug=False
    )
