#!/bin/bash
# Start both APIs concurrently
echo "Starting General API on port 3001..."
python -m uvicorn general_api.main:app --host 0.0.0.0 --port 3001 &

echo "Starting AI Processing API on port 5001..."
python -m uvicorn ai_api.main:app --host 0.0.0.0 --port 5001 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
