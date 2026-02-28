#!/usr/bin/env python3
"""Query mutmut cache for surviving mutants and write full report."""
import sqlite3
import os
import subprocess
import sys

def main():
    cache_path = '.mutmut-cache'
    output_path = 'scripts/mutation_report.txt'
    
    if not os.path.exists(cache_path):
        print("No .mutmut-cache file found. Run mutmut first.")
        sys.exit(1)

    conn = sqlite3.connect(cache_path)
    c = conn.cursor()
    
    lines = []
    lines.append("=" * 60)
    lines.append("MUTATION TESTING REPORT")
    lines.append("=" * 60)
    
    # Get table schema
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in c.fetchall()]
    lines.append(f"\nTables: {tables}")
    
    for table in tables:
        c.execute(f"PRAGMA table_info({table})")
        cols = c.fetchall()
        lines.append(f"\n{table}: {[col[1] for col in cols]}")
    
    # Get status counts
    c.execute("SELECT status, COUNT(*) FROM Mutant GROUP BY status ORDER BY status")
    lines.append("\n=== Summary ===")
    total = 0
    killed = 0
    survived = 0
    for status, count in c.fetchall():
        lines.append(f"  {status}: {count}")
        total += count
        if 'killed' in status:
            killed += count
        if status == 'survived':
            survived = count
    
    if total > 0:
        score = (killed / total) * 100
        lines.append(f"\nMutation Score: {score:.1f}%")
    
    # Get surviving mutants - just raw data
    lines.append("\n=== Raw Surviving Mutants ===")
    c.execute("SELECT * FROM Mutant WHERE status = 'survived' LIMIT 20")
    survivors = c.fetchall()
    for row in survivors:
        lines.append(str(row))
    
    conn.close()
    
    # Now get the actual diff for each survivor
    lines.append("\n" + "=" * 60)
    lines.append("MUTANT DETAILS (from mutmut show)")
    lines.append("=" * 60)
    
    # Run mutmut show for each survivor ID
    survivor_ids = [7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21]  # From earlier results
    
    for sid in survivor_ids:
        try:
            result = subprocess.run(
                ['python', '-m', 'mutmut', 'show', str(sid)],
                capture_output=True, text=True, timeout=10
            )
            lines.append(f"\n--- Mutant {sid} ---")
            lines.append(result.stdout if result.stdout else "(no output)")
        except Exception as e:
            lines.append(f"\n--- Mutant {sid} ---")
            lines.append(f"Error: {e}")
    
    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    print(f"Report written to {output_path}")

if __name__ == "__main__":
    main()
