#!/bin/bash

# Test script for transcript endpoint

echo "Testing transcript endpoint..."
echo ""

# Test 1: Critical threat
echo "Test 1: Critical threat (gun)"
curl -X POST http://localhost:3000/transcript?uid=test-user \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-1",
    "segments": [
      {
        "id": "seg1",
        "text": "Help! Someone has a gun!",
        "speaker": "SPEAKER_0",
        "speaker_id": 0,
        "is_user": false,
        "start": 0.0,
        "end": 2.5
      }
    ]
  }'
echo -e "\n\n"

# Test 2: Medium threat
echo "Test 2: Medium threat (scared, unsafe)"
curl -X POST http://localhost:3000/transcript?uid=test-user \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-2",
    "segments": [
      {
        "id": "seg2",
        "text": "I feel scared and unsafe here",
        "speaker": "SPEAKER_0",
        "speaker_id": 0,
        "is_user": false,
        "start": 0.0,
        "end": 3.0
      }
    ]
  }'
echo -e "\n\n"

# Test 3: Normal conversation
echo "Test 3: Normal conversation"
curl -X POST http://localhost:3000/transcript?uid=test-user \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-3",
    "segments": [
      {
        "id": "seg3",
        "text": "How are you doing today?",
        "speaker": "SPEAKER_0",
        "speaker_id": 0,
        "is_user": false,
        "start": 0.0,
        "end": 2.0
      }
    ]
  }'
echo -e "\n\n"

echo "Tests complete! Check the dashboard at http://localhost:5173/"
