create or replace function public.sync_blog_idea_conversion_fields()
returns trigger
language plpgsql
as $$
begin
  if new.converted_blog_id is null then
    new.is_converted := false;
  else
    new.is_converted := true;
  end if;
  return new;
end;
$$;

update public.blog_ideas
set is_converted = (converted_blog_id is not null)
where is_converted is distinct from (converted_blog_id is not null);

drop trigger if exists blog_ideas_sync_conversion_fields on public.blog_ideas;
create trigger blog_ideas_sync_conversion_fields
before insert or update of is_converted, converted_blog_id on public.blog_ideas
for each row
execute function public.sync_blog_idea_conversion_fields();

notify pgrst, 'reload schema';
