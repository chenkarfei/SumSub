#!/usr/bin/env bash
# cleanup-old-files.sh — remove the obsolete Settings page + scripts.
#
# These files are no longer reachable from the UI (Settings nav item removed,
# server route redirects /dashboard/settings → /dashboard). Run this ONCE
# after copying the Phase 2 patch over your project.
#
# Run from the project root:
#   bash cleanup-old-files.sh

set -e
cd "$(dirname "$0")"

removed=0
for f in \
  public/admin/dashboard/settings.html \
  public/agent/dashboard/settings.html \
  public/js/admin-settings.js \
  public/js/agent-settings.js
do
  if [ -f "$f" ]; then
    rm "$f"
    echo "  removed  $f"
    removed=$((removed+1))
  else
    echo "  skipped  $f  (not present)"
  fi
done

echo ""
echo "Done. Removed $removed file(s)."
echo "You can now delete this script too:  rm cleanup-old-files.sh"
