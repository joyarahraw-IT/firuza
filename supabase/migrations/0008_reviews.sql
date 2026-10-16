-- Firuza · 0008 reviews show the customer's first name. Safe to run more than once.
alter table public.reviews add column if not exists author_name text check (author_name is null or char_length(author_name) <= 60);
