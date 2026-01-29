#!/bin/bash

# KinderCare Knowledge Base CLI
# Usage: ./knowledge.sh <command> [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KNOWLEDGE_DIR="$(dirname "$SCRIPT_DIR")"
FACTS_FILE="$KNOWLEDGE_DIR/facts.jsonl"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Generate hash-based ID from assertion
generate_id() {
    local assertion="$1"
    local hash=$(echo -n "$assertion" | shasum -a 256 | cut -c1-8)
    echo "FACT-$hash"
}

# Generate content hash from assertion + guidance
generate_content_hash() {
    local content="$1"
    local hash=$(echo -n "$content" | shasum -a 256 | cut -c1-16)
    echo "sha256:$hash"
}

# Show help
show_help() {
    echo -e "${CYAN}KinderCare Knowledge Base CLI${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  search    Search facts by topic, keyword, or ID"
    echo "  add       Add a new fact"
    echo "  list      List all facts"
    echo "  get       Get a specific fact by ID"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 search --topic=age"
    echo "  $0 search --keyword=rating"
    echo "  $0 search --topic=pricing --format=context"
    echo "  $0 list"
    echo "  $0 list --status=active"
    echo "  $0 get FACT-a1b2c3d4"
    echo "  $0 add"
    echo ""
}

# Search facts
cmd_search() {
    local topic=""
    local keyword=""
    local format="compact"
    local status="active"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --topic=*)
                topic="${1#*=}"
                shift
                ;;
            --keyword=*)
                keyword="${1#*=}"
                shift
                ;;
            --format=*)
                format="${1#*=}"
                shift
                ;;
            --status=*)
                status="${1#*=}"
                shift
                ;;
            *)
                keyword="$1"
                shift
                ;;
        esac
    done

    if [[ ! -f "$FACTS_FILE" ]]; then
        echo -e "${RED}Error: facts.jsonl not found${NC}"
        exit 1
    fi

    local results=""

    if [[ -n "$topic" ]]; then
        results=$(cat "$FACTS_FILE" | jq -c "select(.topics | contains([\"$topic\"])) | select(.status == \"$status\")")
    elif [[ -n "$keyword" ]]; then
        results=$(cat "$FACTS_FILE" | jq -c "select(.status == \"$status\") | select(.assertion + .guidance | test(\"$keyword\"; \"i\"))")
    else
        results=$(cat "$FACTS_FILE" | jq -c "select(.status == \"$status\")")
    fi

    if [[ -z "$results" ]]; then
        echo -e "${YELLOW}No facts found${NC}"
        return
    fi

    local count=$(echo "$results" | wc -l | tr -d ' ')
    echo -e "${GREEN}Found $count fact(s)${NC}"
    echo ""

    case $format in
        compact)
            echo "$results" | while read -r fact; do
                local id=$(echo "$fact" | jq -r '.id')
                local assertion=$(echo "$fact" | jq -r '.assertion')
                local topics=$(echo "$fact" | jq -r '.topics | join(", ")')
                echo -e "${BLUE}$id${NC} [$topics]"
                echo "  $assertion"
                echo ""
            done
            ;;
        full)
            echo "$results" | jq '.'
            ;;
        context)
            echo -e "${CYAN}=== Domain Knowledge ===${NC}"
            echo ""
            echo "$results" | while read -r fact; do
                local assertion=$(echo "$fact" | jq -r '.assertion')
                local guidance=$(echo "$fact" | jq -r '.guidance')
                echo -e "- ${YELLOW}$assertion${NC}"
                echo "  Guidance: $guidance"
                echo ""
            done
            ;;
    esac
}

# List all facts
cmd_list() {
    local status=""
    local topic=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --status=*)
                status="${1#*=}"
                shift
                ;;
            --topic=*)
                topic="${1#*=}"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    if [[ ! -f "$FACTS_FILE" ]]; then
        echo -e "${RED}Error: facts.jsonl not found${NC}"
        exit 1
    fi

    local filter="."
    if [[ -n "$status" ]]; then
        filter="select(.status == \"$status\")"
    fi
    if [[ -n "$topic" ]]; then
        filter="$filter | select(.topics | contains([\"$topic\"]))"
    fi

    local count=$(cat "$FACTS_FILE" | jq -c "$filter" | wc -l | tr -d ' ')
    echo -e "${GREEN}Total: $count facts${NC}"
    echo ""
    echo -e "${CYAN}ID              Topics                  Assertion${NC}"
    echo "─────────────────────────────────────────────────────────────────────────────"

    cat "$FACTS_FILE" | jq -c "$filter" | while read -r fact; do
        local id=$(echo "$fact" | jq -r '.id')
        local assertion=$(echo "$fact" | jq -r '.assertion' | cut -c1-45)
        local topics=$(echo "$fact" | jq -r '.topics | join(",")' | cut -c1-20)
        local status=$(echo "$fact" | jq -r '.status')

        if [[ "$status" == "active" ]]; then
            printf "${BLUE}%-15s${NC} %-23s %s...\n" "$id" "$topics" "$assertion"
        else
            printf "${YELLOW}%-15s${NC} %-23s %s... [%s]\n" "$id" "$topics" "$assertion" "$status"
        fi
    done
}

# Get a specific fact
cmd_get() {
    local fact_id="$1"

    if [[ -z "$fact_id" ]]; then
        echo -e "${RED}Error: Please provide a fact ID${NC}"
        echo "Usage: $0 get <FACT-ID>"
        exit 1
    fi

    if [[ ! -f "$FACTS_FILE" ]]; then
        echo -e "${RED}Error: facts.jsonl not found${NC}"
        exit 1
    fi

    local fact=$(cat "$FACTS_FILE" | jq -c "select(.id == \"$fact_id\")")

    if [[ -z "$fact" ]]; then
        echo -e "${RED}Fact not found: $fact_id${NC}"
        exit 1
    fi

    echo -e "${CYAN}=== $fact_id ===${NC}"
    echo ""
    echo "$fact" | jq '{
        id,
        status,
        topics,
        assertion,
        guidance,
        evidence,
        learned_from,
        created_at,
        related_to
    }'
}

# Add a new fact interactively
cmd_add() {
    echo -e "${CYAN}Add New Fact${NC}"
    echo ""

    read -p "Assertion (what is true): " assertion
    if [[ -z "$assertion" ]]; then
        echo -e "${RED}Error: Assertion is required${NC}"
        exit 1
    fi

    read -p "Guidance (how to use this): " guidance
    if [[ -z "$guidance" ]]; then
        echo -e "${RED}Error: Guidance is required${NC}"
        exit 1
    fi

    read -p "Topics (comma-separated, e.g., age,eligibility): " topics_input
    if [[ -z "$topics_input" ]]; then
        echo -e "${RED}Error: At least one topic is required${NC}"
        exit 1
    fi

    read -p "Evidence (how we know this): " evidence
    read -p "Learned from (query/context): " learned_from

    # Generate IDs
    local id=$(generate_id "$assertion")
    local content_hash=$(generate_content_hash "$assertion$guidance")
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Convert topics to JSON array
    local topics_json=$(echo "$topics_input" | tr ',' '\n' | jq -R . | jq -s .)

    # Check for duplicate
    if grep -q "\"id\":\"$id\"" "$FACTS_FILE" 2>/dev/null; then
        echo -e "${YELLOW}Warning: Fact with similar assertion already exists (ID: $id)${NC}"
        read -p "Add anyway? (y/N): " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            echo "Cancelled"
            exit 0
        fi
        # Append suffix for uniqueness
        id="$id-$(date +%s | tail -c 5)"
    fi

    # Create fact JSON
    local fact=$(jq -n \
        --arg id "$id" \
        --arg content_hash "$content_hash" \
        --arg created_at "$timestamp" \
        --arg updated_at "$timestamp" \
        --arg assertion "$assertion" \
        --arg guidance "$guidance" \
        --arg evidence "$evidence" \
        --arg learned_from "$learned_from" \
        --argjson topics "$topics_json" \
        '{
            id: $id,
            content_hash: $content_hash,
            created_at: $created_at,
            updated_at: $updated_at,
            status: "active",
            topics: $topics,
            assertion: $assertion,
            guidance: $guidance,
            evidence: $evidence,
            learned_from: $learned_from,
            supersedes: null,
            related_to: []
        }')

    # Append to file
    echo "$fact" | jq -c . >> "$FACTS_FILE"

    echo ""
    echo -e "${GREEN}Fact added successfully!${NC}"
    echo -e "ID: ${BLUE}$id${NC}"
}

# Main
case "${1:-help}" in
    search)
        shift
        cmd_search "$@"
        ;;
    list)
        shift
        cmd_list "$@"
        ;;
    get)
        shift
        cmd_get "$@"
        ;;
    add)
        shift
        cmd_add "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
