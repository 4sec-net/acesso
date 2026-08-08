#!/usr/bin/env bash
# Faz o deploy da infraestrutura (Cognito + API + DynamoDB + S3 + CloudFront).
# Uso: ./deploy.sh [nome-da-stack]   (padrão: financas)
# Requer: AWS CLI e AWS SAM CLI configurados (aws configure).
set -euo pipefail

STACK="${1:-financas}"
REGION="${AWS_REGION:-us-east-1}"
cd "$(dirname "$0")"

echo "==> sam build"
sam build

echo "==> sam deploy (stack: $STACK, região: $REGION)"
sam deploy \
  --stack-name "$STACK" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo
echo "==> Saídas da stack:"
aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs" --output table

echo
echo "Próximo passo: publique o app com  ./deploy-frontend.sh $STACK"
