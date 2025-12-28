#!/bin/bash

# Cleanup Claude Session Branches
# Provides options to delete old Claude session branches

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Claude Session Branch Cleanup"
echo "════════════════════════════════════════════════════════"
echo ""

# Fetch latest from remote
echo -e "${BLUE}Fetching latest branches...${NC}"
git fetch --prune origin

# Get all Claude branches (remote)
CLAUDE_BRANCHES=$(git branch -r | grep 'origin/claude/' | sed 's|origin/||' | sort -r)

if [ -z "$CLAUDE_BRANCHES" ]; then
    echo -e "${GREEN}✓ No Claude branches found${NC}"
    echo ""
    exit 0
fi

# Count branches
BRANCH_COUNT=$(echo "$CLAUDE_BRANCHES" | wc -l)
echo -e "${YELLOW}Found $BRANCH_COUNT Claude branch(es):${NC}"
echo ""
echo "$CLAUDE_BRANCHES" | nl -w2 -s'. '
echo ""

# Get the latest branch (first in sorted list)
LATEST_BRANCH=$(echo "$CLAUDE_BRANCHES" | head -n 1)

echo "Latest branch: ${GREEN}$LATEST_BRANCH${NC}"
echo ""
echo "Options:"
echo "  1) Keep latest ($LATEST_BRANCH), delete all others"
echo "  2) Delete ALL Claude branches (including latest)"
echo "  3) Cancel"
echo ""
read -p "Choose option [1-3]: " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Keeping latest branch: $LATEST_BRANCH${NC}"
        echo ""

        # Delete all except latest
        echo "$CLAUDE_BRANCHES" | tail -n +2 | while read -r branch; do
            echo -e "${RED}Deleting: $branch${NC}"
            git push origin --delete "$branch" 2>/dev/null || true
        done

        echo ""
        echo -e "${GREEN}✓ Cleanup complete${NC}"
        echo -e "Remaining: ${GREEN}$LATEST_BRANCH${NC}"
        ;;

    2)
        echo ""
        echo -e "${RED}⚠️  WARNING: This will delete ALL Claude branches!${NC}"
        read -p "Are you sure? [y/N]: " confirm

        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            echo ""
            echo "$CLAUDE_BRANCHES" | while read -r branch; do
                echo -e "${RED}Deleting: $branch${NC}"
                git push origin --delete "$branch" 2>/dev/null || true
            done

            echo ""
            echo -e "${GREEN}✓ All Claude branches deleted${NC}"
        else
            echo ""
            echo -e "${BLUE}Cancelled${NC}"
        fi
        ;;

    3)
        echo ""
        echo -e "${BLUE}Cancelled${NC}"
        ;;

    *)
        echo ""
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "════════════════════════════════════════════════════════"
echo ""
