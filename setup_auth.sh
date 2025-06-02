#!/bin/bash

# Setup script for AI Hedge Fund authentication system

echo "Setting up AI Hedge Fund with authentication..."

# Install Python dependencies
echo "Installing Python dependencies..."
poetry install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd app/frontend
npm install
cd ../..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update the .env file with your actual API keys and Redis URL"
fi

echo "Setup complete!"
echo ""
echo "To run the application:"
echo "1. Update .env file with your API keys"
echo "2. Start Redis server (or use Upstash Redis)"
echo "3. Run backend: cd app && poetry run python -m backend.main"
echo "4. Run frontend: cd app/frontend && npm run dev"
echo ""
echo "Features added:"
echo "- Phone number + SMS verification login"
echo "- Invite code system (5 codes per user)"
echo "- Trial users get 5 free API calls when using invite code"
echo "- Monthly/Yearly subscription plans"
echo "- User profile and settings page"
echo "- API access control and usage tracking"
echo "- Redis-based session management"