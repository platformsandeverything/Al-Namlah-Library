# مكتبة حلقة مسجد النملة

نظام عربي متجاوب لإدارة المكتبة الورقية للحلقة، مبني بـ HTML وCSS وJavaScript، مع Supabase للخلفية وRender للنشر. تسجيل الدخول برقم الجوال، ويُجبر الحساب الجديد على تغيير كلمة المرور المؤقتة عند أول دخول.

## التشغيل السريع

```bash
npm install
npm run dev
```

تعمل أزرار «دخول كطالب» و«دخول كمشرف» كمعاينة محلية بلا إعدادات.

## ربط Supabase

1. أنشئ مشروعًا في Supabase.
2. نفّذ `supabase/schema.sql` في SQL Editor.
3. أنشئ المستخدمين من Authentication. كل مستخدم جديد يصبح طالبًا تلقائيًا.
4. لتحويل مستخدم إلى مشرف نفّذ:

```sql
update public.profiles set role = 'admin' where id = 'USER_UUID';
```

5. أنشئ ملف `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

إذا سبق أن أنشأت قاعدة البيانات قبل إضافة صفحة «المسيرة»، فنفّذ أيضًا
`supabase/migrations/001_add_reading_journey.sql` مرة واحدة.

إذا كانت قاعدة البيانات منشأة قبل إضافة دخول الجوال، نفّذ أيضًا
`supabase/migrations/002_phone_login_and_first_password.sql` مرة واحدة.

## إضافة الطلاب دفعة واحدة

انسخ `students.example.json` إلى `students.json` وضع الاسم ورقم الجوال لكل طالب، ثم شغّل أداة الاستيراد من جهاز موثوق بعد ضبط متغيرَي الخادم الموضحين في `.env.example`:

```bash
npm run import-students -- students.json student-credentials.json
```

يُنشأ لكل طالب رقم دخول وكلمة مرور عشوائية، ويحفظ ملف النتائج بصلاحية قراءة للمالك فقط. لا تضع مفتاح `SUPABASE_SERVICE_ROLE_KEY` في Render ولا في متغيرات تبدأ بـ `VITE_`؛ فهو مفتاح إداري سري.

## النشر على Render

ارفع المشروع إلى GitHub ثم اختر **New > Blueprint** في Render. يقرأ Render ملف `render.yaml`. أضف قيمتي `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` في Environment، ثم أعد النشر.

## تحديث نقاط الأربعاء

الدالة `award_weekly_points` موجودة في المخطط. فعّل `pg_cron` من Supabase وجدولها بالأمر الموجود في نهاية ملف SQL. تُضاف نقطة عن كل صفحة مسجلة في `pages_week` ثم يبدأ الأسبوع الجديد من الصفر.
