#!/bin/bash

# Configure git to use .githooks directory for hooks
# Run this after cloning the repository

git config core.hooksPath .githooks
echo "✅ Git hooks configured to use .githooks directory"
