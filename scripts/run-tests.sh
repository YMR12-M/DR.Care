#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

step() { printf "\n${GREEN}==> %s${NC}\n" "$1"; }
fail() { printf "${RED}FAILED: %s${NC}\n" "$1"; exit 1; }

step "PHP syntax lint"
for f in api/*.php; do
  php -l "$f" > /dev/null || fail "PHP lint: $f"
done

step "Composer install (dev)"
if [ ! -f vendor/bin/phpunit ]; then
  composer install --no-interaction --no-progress --prefer-dist
fi

step "PHPUnit integration tests"
vendor/bin/phpunit --colors=always

step "Java pricing tests"
if java -version >/dev/null 2>&1 && javac -version >/dev/null 2>&1; then
  chmod +x tests/test_pricing_java.sh
  tests/test_pricing_java.sh
else
  printf "${RED}SKIP: Java not installed — Java tests run in CI only${NC}\n"
fi

step "Python export tests"
python3 -m unittest discover -s tests -p 'test_*.py' -v

step "Node ESLint"
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi
npm run lint

printf "\n${GREEN}All DR.Care tests passed.${NC}\n"
