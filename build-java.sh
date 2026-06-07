#!/usr/bin/env sh
set -eu
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/java/src"
CLASSES="$ROOT/java/classes"

printf 'Compiling Java sources...\n'
mkdir -p "$CLASSES"
javac -d "$CLASSES" "$SRC"/com/drcare/*.java
printf 'Java classes compiled to %s\n' "$CLASSES"
