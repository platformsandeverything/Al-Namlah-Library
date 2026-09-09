alter table public.profiles add column if not exists total_pages_read bigint not null default 0;

update public.profiles p set total_pages_read = coalesce((select sum(l.pages_read)::bigint from public.loans l where l.student_id=p.id),0) where p.role='student';

drop trigger if exists enforce_student_request_limits_trigger on public.book_requests;
create or replace function public.enforce_student_request_limits() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.student_id::text,0));
  if (select count(*) from public.loans where student_id=new.student_id and returned_at is null)>=3 then raise exception 'لديك 3 كتب حاليًا؛ سلّم أحدها للمشرف قبل طلب كتاب جديد'; end if;
  if exists(select 1 from public.book_requests where student_id=new.student_id and book_id=new.book_id and status='pending') then raise exception 'لديك طلب قائم لهذا الكتاب'; end if;
  return new;
end; $$;
create trigger enforce_student_request_limits_trigger before insert on public.book_requests for each row execute function public.enforce_student_request_limits();

create or replace function public.record_reading_progress(loan_id bigint,new_page integer) returns void language plpgsql security definer set search_path=public as $$
declare current_loan public.loans; book_pages integer; page_delta integer; active_multiplier integer:=1;
begin
  select * into current_loan from public.loans where id=loan_id and student_id=auth.uid() and returned_at is null for update;
  if not found then raise exception 'الإعارة غير موجودة'; end if;
  select pages into book_pages from public.books where id=current_loan.book_id;
  if new_page<current_loan.pages_read or new_page>book_pages then raise exception 'رقم الصفحة غير صحيح'; end if;
  page_delta:=new_page-current_loan.pages_read;
  select greatest(coalesce(max(points_multiplier) filter(where role='admin' and multiplier_until>now()),1),1) into active_multiplier from public.profiles;
  update public.loans set pages_read=new_page,completed_at=case when new_page=book_pages then coalesce(completed_at,now()) else completed_at end where id=loan_id;
  update public.profiles set pages_week=coalesce(pages_week,0)+page_delta,total_pages_read=coalesce(total_pages_read,0)+page_delta,points=coalesce(points,0)+(page_delta*active_multiplier) where id=auth.uid();
end; $$;

alter table public.books add column if not exists is_archived boolean not null default false;
create or replace function public.admin_delete_book(target_book_id bigint) returns text language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'هذه العملية للمشرف فقط'; end if;
  if exists(select 1 from public.loans where book_id=target_book_id and returned_at is null) then raise exception 'لا يمكن حذف الكتاب وهناك نسخة مع طالب'; end if;
  if exists(select 1 from public.book_requests where book_id=target_book_id and status='pending') then raise exception 'عالج طلبات هذا الكتاب قبل حذفه'; end if;
  if exists(select 1 from public.loans where book_id=target_book_id) or exists(select 1 from public.book_reviews where book_id=target_book_id) then
    update public.books set is_archived=true,quantity=0 where id=target_book_id; if not found then raise exception 'الكتاب غير موجود'; end if; return 'archived';
  end if;
  delete from public.books where id=target_book_id; if not found then raise exception 'الكتاب غير موجود'; end if; return 'deleted';
end; $$;
revoke all on function public.admin_delete_book(bigint) from public;
grant execute on function public.admin_delete_book(bigint) to authenticated;

drop function if exists public.submit_book_review(bigint,integer,text);
alter table public.book_reviews alter column rating type numeric(2,1) using rating::numeric;
alter table public.book_reviews drop constraint if exists book_reviews_rating_check;
alter table public.book_reviews add constraint book_reviews_rating_check check(rating between 0.5 and 5 and rating*2=trunc(rating*2));
create function public.submit_book_review(target_loan_id bigint,stars_value numeric,review_note text default '') returns void language plpgsql security definer set search_path=public as $$
declare finished_loan public.loans;
begin
  if stars_value<0.5 or stars_value>5 or stars_value*2<>trunc(stars_value*2) then raise exception 'اختر تقييمًا صحيحًا من نصف نجمة إلى خمس نجوم'; end if;
  select * into finished_loan from public.loans where id=target_loan_id and student_id=auth.uid() and completed_at is not null;
  if not found then raise exception 'لا يمكن تقييم الكتاب قبل إتمامه'; end if;
  if exists(select 1 from public.book_reviews where loan_id=target_loan_id) then raise exception 'سبق أن قيّمت هذا الكتاب'; end if;
  insert into public.book_reviews(loan_id,student_id,book_id,rating,note) values(finished_loan.id,finished_loan.student_id,finished_loan.book_id,stars_value,left(coalesce(review_note,''),600));
end; $$;
revoke all on function public.submit_book_review(bigint,numeric,text) from public;
grant execute on function public.submit_book_review(bigint,numeric,text) to authenticated;
