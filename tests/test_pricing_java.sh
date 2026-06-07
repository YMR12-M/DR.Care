#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

printf '\n=== Java PricingCalculator ===\n'
mkdir -p java/classes
javac -d java/classes java/src/com/drcare/PricingCalculator.java

run_java() {
  pkg="$1"
  car="$2"
  expected="$3"
  actual="$(java -cp java/classes com.drcare.PricingCalculator "$pkg" "$car")"
  if [ "$actual" != "$expected" ]; then
    printf 'FAIL: %s %s => got %s expected %s\n' "$pkg" "$car" "$actual" "$expected"
    exit 1
  fi
  printf 'OK: %s + %s = %s\n' "$pkg" "$car" "$actual"
}

run_java quick sedan 150
run_java full suv 340
run_java detail pickup 770
run_java fleet sedan 0

printf '\nAll Java pricing tests passed.\n'
