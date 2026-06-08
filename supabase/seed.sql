insert into public.projects (
  name,
  tagline,
  status,
  next_milestone,
  mrr,
  users_count,
  stack,
  url_site,
  order_index
) values
(
  'OpFanta',
  'Fantacalcio companion app',
  'live',
  'Miglioramenti stagionali e nuove leghe',
  0,
  0,
  array['Next.js', 'Supabase', 'Anthropic API', 'Stripe'],
  'https://opfanta.it',
  1
),
(
  'SCIA-SaaS',
  'Gestione SCIA VVF per tecnici antincendio',
  'building',
  'MVP con gestione pratiche e scadenze',
  0,
  0,
  array['Next.js', 'Supabase', 'Stripe'],
  null,
  2
),
(
  'Cost-Assistant',
  'Benchmark costi interni per Perelli Consulting',
  'building',
  'Integrazione dati storici e report mensili',
  0,
  0,
  array['Next.js', 'Supabase', 'Anthropic API'],
  null,
  3
);
