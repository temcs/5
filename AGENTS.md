# Project conventions

## Supabase schema
- `supabase.sql` is the single source of truth for the database schema (tables, columns, RLS policies, storage buckets, indexes).
- Whenever any change affects the database (new column, table, policy, index, etc.), always update `supabase.sql` in the same change.
- Keep `supabase.sql` in sync with the columns/relations actually used in the JS code.
