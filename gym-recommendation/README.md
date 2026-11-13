
# OptiFit - Gym Recommendation System

## Project Overview

An independent Rule-Based / Content-Based
Gym Recommendation System developed in Python.

The system recommends gyms based on user
preferences and available gym information.

## Recommendation Criteria

- Sports Activities: 35%
- Facilities and Services: 25%
- Distance and Location: 25%
- Opening Hours: 15%

## Main Features

- Activity Matching
- Facilities Matching
- Haversine Distance Calculation
- Opening Hours Matching
- Weighted Matching Score
- Gym Ranking
- Explainable Recommendations
- Missing Data Handling
- Mandatory Facilities Filtering
- Mandatory Distance Filtering

## Project Files

- main.py: Recommendation algorithm
- sample_gyms.json: Sample gym dataset
- sample_user.json: Sample user preferences
- test_recommendation.py: Core tests
- test_edge_cases.py: Edge case tests

## Requirements

- Python 3.12
- Python standard library

## Run the Project

Open a terminal inside gym-recommendation.

Run:

python main.py

## Run Automated Tests

python -m unittest discover -p "test_*.py" -v

## Recommendation Results

The recommend_gyms(user, gyms) function
returns a ranked list of gym dictionaries.

Each result contains:

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

## Mandatory Constraint Status

eligible:
All mandatory requirements are satisfied.

ineligible:
At least one mandatory requirement is violated.

unverified:
Required information is unavailable.

Only eligible gyms should be displayed
as confirmed recommendations.

## Current Limitations

- Uses sample JSON data instead of a database.
- Supports same-day opening hours.
- Distance is straight-line, not driving distance.
- Some additional validation is still needed.
- Data coverage is reported separately.
- Missing scores receive no weighted points.
- Laravel integration is not implemented yet.

## Integration Plan

The recommendation logic is independent
of the chatbot and Laravel database.

The Software Engineering team will map
database records to the input structure
expected by the recommendation engine.

A suitable integration interface will
be agreed upon before deployment.

## Testing Status

16 automated tests passed on sample data.

Additional testing and performance
evaluation are planned.
