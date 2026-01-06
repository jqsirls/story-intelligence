#!/bin/bash
# Start Fieldnotes Services
# Starts API, MCP, or Scheduler based on argument

set -e

SERVICE=${1:-api}

case $SERVICE in
  api)
    echo "🚀 Starting Fieldnotes REST API..."
    npm run start:api
    ;;
  mcp)
    echo "🚀 Starting Fieldnotes MCP Server..."
    npm run start:mcp
    ;;
  scheduler)
    echo "🚀 Starting Fieldnotes Scheduler..."
    node dist/scheduler.js
    ;;
  all)
    echo "🚀 Starting all Fieldnotes services..."
    echo "   (Use separate terminals for each service)"
    echo ""
    echo "Terminal 1: npm run start:api"
    echo "Terminal 2: npm run start:mcp"
    echo "Terminal 3: node dist/scheduler.js"
    ;;
  *)
    echo "Usage: $0 [api|mcp|scheduler|all]"
    exit 1
    ;;
esac
