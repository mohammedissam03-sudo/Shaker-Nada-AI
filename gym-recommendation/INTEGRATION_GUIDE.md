
# OptiFit Gym Recommendation - Integration Guide

## 1. Overview

The Gym Recommendation System is an independent
rule-based recommendation engine written in Python.

It ranks gyms using:
- Preferred activities: 35%
- Preferred facilities: 25%
- Distance: 25%
- Opening hours: 15%

The recommendation engine does not require model training.

## 2. Technology

- Python 3.12
- Flask 3.1.3
- JSON REST API

## 3. Local Installation

From the gym-recommendation directory:

```bash
python -m pip install -r requirements.txt
python api.py
```

Default local API address:

http://127.0.0.1:5001

This is a development server, not a production deployment.

## 4. API Endpoints

### GET /health

Checks whether the service is running.

Example response:

```json
{
  "service": "OptiFit Gym Recommendation API",
  "status": "ok"
}
```

### POST /recommend

Accepts a JSON object with two properties:

- user: user preferences and location
- gyms: array of available gym objects

Request example:

```json
{
  "user": {
    "user_id": 1,
    "preferred_activities": [
      "swimming",
      "fitness",
      "boxing"
    ],
    "preferred_facilities": [
      "pool",
      "parking"
    ],
    "required_facilities": [
      "pool"
    ],
    "location": {
      "latitude": 31.96,
      "longitude": 35.94
    },
    "max_distance_km": 5,
    "require_max_distance": true,
    "available_times": {
      "monday": {
        "start": "18:00",
        "end": "20:00"
      }
    }
  },
  "gyms": [
    {
      "id": 1,
      "name": "Demo Gym A",
      "activities": [
        "swimming",
        "fitness",
        "boxing"
      ],
      "facilities": [
        "pool",
        "parking",
        "showers"
      ],
      "latitude": 31.95,
      "longitude": 35.93,
      "opening_hours": {
        "monday": {
          "open": "06:00",
          "close": "22:00"
        }
      }
    }
  ]
}
```

## 5. API Response

The response includes:

- total_gyms: number of evaluated gyms
- total_eligible: number of eligible gyms
- recommendations: eligible gyms ranked by score
- other_gyms: ineligible or unverified gyms

Each evaluated gym contains:

- id
- name
- distance_km
- scores
- final_score
- coverage
- reasons
- missing_data
- status
- constraint_reasons

Possible status values:

- eligible: mandatory requirements are satisfied
- ineligible: at least one mandatory requirement fails
- unverified: mandatory requirements cannot be confirmed

The final_score is a number from 0 to 100.

Coverage indicates how much of the requested scoring
information was available for evaluation.

A gym can have a numerical score but still be ineligible.

Missing information must not be treated as confirmed
availability or confirmed absence.

## 6. Laravel Integration Plan

The Software Engineering team will:

1. Retrieve user preferences from the application.
2. Retrieve gym information from the database.
3. Convert database records into the documented JSON format.
4. Send an HTTP POST request to /recommend.
5. Read recommendations and other_gyms from the response.
6. Display rankings, match scores, and explanations.

The database schema mapping must be confirmed by the
Software Engineering team.

The Python recommendation service does not directly
access or modify the Laravel database.

## 7. Important Notes

- Distance is calculated using straight-line geographic distance.
- Opening-hours matching currently supports same-day time ranges.
- Missing gym information is reported explicitly.
- The API currently uses sample JSON for demonstrations.
- Production deployment, authentication, and network access
  must be configured before public use.

## 8. Testing

Run all automated tests:

```bash
python -m unittest discover -s . -p "test_*.py" -v
```

Latest verified test result:

23 tests passed.

## 9. Project Files

- main.py: recommendation engine
- api.py: Flask API
- sample_user.json: sample user preferences
- sample_gyms.json: sample gym information
- integration_demo.py: JSON integration demonstration
- test_api.py: API tests
- test_recommendation.py: recommendation tests
- test_edge_cases.py: edge-case tests
- requirements.txt: Python dependencies
