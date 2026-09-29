-- Afgeschermde opslag voor de foto's van de reisgids. Bucket is privé:
-- alleen gezinsleden (reis.leden) kunnen lezen, alleen een bewerker kan
-- uploaden/wijzigen/verwijderen. De app haalt foto's op via signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reis-fotos', 'reis-fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy reis_fotos_lezen on storage.objects for select to authenticated
  using (bucket_id = 'reis-fotos' and (select reis_intern.is_lid()));
create policy reis_fotos_toevoegen on storage.objects for insert to authenticated
  with check (bucket_id = 'reis-fotos' and (select reis_intern.is_bewerker()));
create policy reis_fotos_wijzigen on storage.objects for update to authenticated
  using (bucket_id = 'reis-fotos' and (select reis_intern.is_bewerker()))
  with check (bucket_id = 'reis-fotos' and (select reis_intern.is_bewerker()));
create policy reis_fotos_verwijderen on storage.objects for delete to authenticated
  using (bucket_id = 'reis-fotos' and (select reis_intern.is_bewerker()));
