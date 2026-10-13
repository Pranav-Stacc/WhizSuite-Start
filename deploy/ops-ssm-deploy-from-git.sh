#!/bin/bash
set -eu
TAG="${1:?usage: ops-ssm-deploy-from-git.sh <git-sha>}"
REGISTRY=508193318963.dkr.ecr.ap-south-1.amazonaws.com
cd /opt/whizsuite
git remote set-url origin https://github.com/Pranav-Stacc/WhizSuite-Start.git
git fetch origin main --depth=1
git checkout -f "$TAG"
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin "$REGISTRY"
docker build -f apps/api/Dockerfile -t "$REGISTRY/whizsuite-api:$TAG" .
docker push "$REGISTRY/whizsuite-api:$TAG"
docker build -f apps/agent/Dockerfile -t "$REGISTRY/whizsuite-agent:$TAG" apps/agent
docker push "$REGISTRY/whizsuite-agent:$TAG"
cd deploy
bash deploy.sh "$TAG"
