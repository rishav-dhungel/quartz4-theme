#!/bin/bash

#
# topos.sh - Clean and sort theme color definitions
#
# This script processes a colors.json file containing theme definitions.
# It performs the following steps:
#   1. Sorts all remaining theme entries in alphabetical order by key.
#   2. Writes the cleaned and sorted JSON to an output file
#      (default: colors-cleaned.json, unless otherwise specified).
#
# Usage:
#   ./topos.sh [input_file] [output_file]
#
# Examples:
#   ./topos.sh               # reads colors.json → writes colors.cleaned.json
#   ./topos.sh my.json out.json
#
# Requirements:
#   - jq (command-line JSON processor)
#


# Input file (default: colors.json)
INPUT_FILE=${1:-colors.json}
# Output file (default: colors.cleaned.json)
OUTPUT_FILE=${2:-colors-cleaned.json}

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: File '$INPUT_FILE' not found!"
  exit 1
fi

# Remove keys ending with "New" and sort alphabetically
jq 'del(.colors | to_entries[] | select(.key | endswith("New")) | .key)
    | .colors |= (to_entries | sort_by(.key) | from_entries)' \
    "$INPUT_FILE" > "$OUTPUT_FILE"

echo "Cleaned and sorted JSON written to $OUTPUT_FILE"
