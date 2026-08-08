#!/usr/bin/env bash
# Publica o app (pasta financas/) no S3, gera o config.js a partir das saídas da
# stack e invalida o cache do CloudFront.
# Uso: ./deploy-frontend.sh [nome-da-stack]   (padrão: financas)
set -euo pipefail

STACK="${1:-financas}"
REGION="${AWS_REGION:-us-east-1}"
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"

out() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

BUCKET="$(out SiteBucketName)"
DIST="$(out DistributionId)"
API="$(out ApiUrl)"
POOL="$(out UserPoolId)"
CLIENT="$(out UserPoolClientId)"
CFURL="$(out CloudFrontUrl)"

echo "==> Gerando financas/config.js"
cat > "$ROOT/financas/config.js" <<EOF
/* Gerado automaticamente por deploy-frontend.sh — não edite à mão. */
window.AWS_CONFIG = {
  region: "$REGION",
  userPoolId: "$POOL",
  clientId: "$CLIENT",
  apiUrl: "$API"
};
EOF

echo "==> Publicando app em s3://$BUCKET/"
aws s3 sync "$ROOT/financas/" "s3://$BUCKET/" --delete \
  --exclude "twa-manifest.json" \
  --exclude "GUIA-PLAYSTORE.md"

# Digital Asset Links (para TWA no domínio do CloudFront/próprio domínio)
if [ -f "$ROOT/.well-known/assetlinks.json" ]; then
  aws s3 cp "$ROOT/.well-known/assetlinks.json" \
    "s3://$BUCKET/.well-known/assetlinks.json" --content-type application/json
fi

echo "==> Invalidando cache do CloudFront"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" >/dev/null

echo
echo "Pronto! App publicado em: $CFURL"
