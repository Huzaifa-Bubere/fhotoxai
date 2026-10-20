#!/usr/bin/env python3
"""
Apply versioned SQL migrations (backend/migrations/*.sql) to a running
PostgreSQL database, tracking progress in schema_migrations.

Safe against existing databases with data: every migration file is
idempotent (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) and
never deletes rows. Re-running is a no-op for files already applied.

Usage (from the backend/ directory, with DB_* env vars or db/.env set):

    python scripts/apply_migrations.py            # apply pending migrations
    python scripts/apply_migrations.py --status   # show applied/pending
"""

import argparse
import glob
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def ensure_migrations_table(run_statement):
    run_statement(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        "name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply backend SQL migrations")
    parser.add_argument("--status", action="store_true", help="show status and exit")
    args = parser.parse_args()

    try:
        from general_api.database import (
            execute_query,
            execute_update,
            execute_update_safely,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: could not import database helpers: {exc}")
        print("Set DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME (or db/.env) and retry.")
        return 2

    try:
        ensure_migrations_table(execute_update_safely)
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: could not reach database: {exc}")
        return 2

    migrations_dir = os.path.join(BACKEND_DIR, "migrations")
    files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    if not files:
        print(f"No migration files found in {migrations_dir}")
        return 0

    def _is_comment_only(statement: str) -> bool:
        """True when a split fragment contains no executable SQL."""
        for line in statement.splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("--"):
                return False
        return True

    applied = {row["name"] for row in (execute_query("SELECT name FROM schema_migrations") or [])}
    pending = [os.path.basename(p) for p in files if os.path.basename(p) not in applied]

    print(f"Applied migrations: {len(applied)}  |  Pending: {len(pending)}")
    for name in sorted(applied):
        print(f"  [x] {name}")
    for name in pending:
        print(f"  [ ] {name}")

    if args.status:
        return 0
    if not pending:
        print("Nothing to do — database is up to date.")
        return 0

    failures = 0
    for path in files:
        name = os.path.basename(path)
        if name in applied:
            continue
        print(f"Applying {name} ...", end=" ")
        with open(path, "r", encoding="utf-8") as handle:
            sql = handle.read()
        statements = [
            s.strip() for s in sql.split(";")
            if s.strip() and not _is_comment_only(s.strip())
        ]
        statement_errors = 0
        for statement in statements:
            # create extension inside migration may need superuser; tolerate.
            if statement.lower().startswith("create extension"):
                try:
                    execute_update_safely(statement)
                except Exception as ext_error:  # noqa: BLE001
                    print(f"\n  warning: {ext_error}; continuing (extension may exist)", end="")
                continue
            try:
                execute_update(statement)  # raises on real failures
            except Exception as err:  # noqa: BLE001
                # Idempotent DDL can legitimately no-op on existing databases
                # (e.g. duplicate-data violations during re-runs); errors are
                # reported but only abort recording when the file changed nothing.
                statement_errors += 1
                print(f"\n  ERROR: {err}", end="")
        if statement_errors == 0:
            execute_update("INSERT INTO schema_migrations (name) VALUES (%s)", (name,))
            print(" OK")
        else:
            failures += 1
            print(f" FAILED ({statement_errors} statement(s))")

    if failures:
        print(f"{failures} migration(s) failed; nothing to roll back (all statements idempotent).")
        return 1
    print("All migrations applied successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
