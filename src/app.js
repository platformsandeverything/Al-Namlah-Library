import './styles.css';
import { createClient } from '@supabase/supabase-js';

const sbUrl=import.meta.env.VITE_SUPABASE_URL, sbKey=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=sbUrl&&sbKey?createClient(sbUrl,sbKey):null;
const demo={
  books:[
    {id:1,title:'الرحيق المختوم',author:'صفي الرحمن المباركفوري',summary:'بحث في السيرة النبوية على صاحبها أفضل الصلاة والسلام.',quantity:4,pages:520,cover:'c1'},
    {id:2,title:'لأنك الله',author:'علي بن جابر الفيفي',summary:'رحلة إلى السماء السابعة والتأمل في أسماء الله الحسنى.',quantity:2,pages:192,cover:'c2'},
    {id:3,title:'صور من حياة الصحابة',author:'عبد الرحمن رأفت الباشا',summary:'مواقف مضيئة من حياة أصحاب رسول الله.',quantity:6,pages:448,cover:'c3'},
    {id:4,title:'فاتتني صلاة',author:'إسلام جمال',summary:'كتاب يعين القارئ على المحافظة على الصلاة وحضور القلب.',quantity:1,pages:215,cover:'c4'},
    {id:5,title:'الداء والدواء',author:'ابن قيم الجوزية',summary:'جواب شاف لمن سأل عن الدواء النافع.',quantity:0,pages:384,cover:'c5'}
  ],
  profiles:[
    {id:'demo-admin',name:'مشرف المكتبة التجريبي',phone:'0500000000',role:'admin',points:0,weekly_target:70,books_count:0,pages_week:0,must_change_password:false},
    {id:'s1',name:'عبدالله محمد',role:'student',points:247,weekly_target:100,books_count:2,pages_week:58},
    {id:'s2',name:'عمر خالد',role:'student',points:231,weekly_target:80,books_count:1,pages_week:44},
    {id:'s3',name:'سلمان أحمد',role:'student',points:198,weekly_target:70,books_count:2,pages_week:39},
    {id:'s4',name:'يوسف علي',role:'student',points:176,weekly_target:60,books_count:1,pages_week:35}
  ],
  loans:[
    {id:1,student_id:'s1',book_id:1,pages_read:318,completed_at:null,returned_at:null},
    {id:2,student_id:'s1',book_id:2,pages_read:74,completed_at:null,returned_at:null},
    {id:3,student_id:'s1',book_id:3,pages_read:448,completed_at:'2026-08-13',returned_at:'2026-08-14'},
    {id:4,student_id:'s1',book_id:4,pages_read:215,completed_at:'2026-07-23',returned_at:'2026-07-24'}
  ],
  requests:[
    {id:1,student_id:'s1',book_id:3,note:'أرغب بقراءته ضمن خطة السيرة لهذا الشهر.',status:'pending',created_at:'2026-08-29'},
    {id:2,student_id:'s2',book_id:4,note:'اقترحه عليّ المشرف.',status:'pending',created_at:'2026-08-28'},
    {id:3,student_id:'s1',book_id:5,note:'أرغب بقراءته بعد إنهاء الكتاب الحالي.',status:'rejected',created_at:'2026-08-20'}
  ],
  reviews:[
    {id:1,loan_id:3,student_id:'s1',book_id:3,rating:5,note:'كتاب جميل ومفيد، أعجبني أسلوب عرض المواقف.'},
    {id:2,loan_id:4,student_id:'s2',book_id:4,rating:4,note:'حفّزني على المحافظة على الصلاة.'}
  ]
};
let state={user:null,role:null,page:'public',books:[],profiles:[],loans:[],requests:[],reviews:[],modal:null,demoMode:false};
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const firstTwoNames=name=>String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ');
const weeklyTarget=profile=>Number(profile?.weekly_target??profile?.daily_target??70);
const riyadhDay=value=>value==null?`__now__${Date.now()}`:new Date(value).toISOString();
const activeMultiplier=()=>{
  const now=Date.now(),active=state.profiles.filter(p=>p.role==='admin'&&Number(p.points_multiplier)>1&&new Date(p.multiplier_until||0).getTime()>now);
  return active.length?Math.max(...active.map(p=>Number(p.points_multiplier))):1;
};
const activeMultiplierUntil=()=>state.profiles.filter(p=>p.role==='admin'&&Number(p.points_multiplier)===activeMultiplier()&&new Date(p.multiplier_until||0).getTime()>Date.now()).sort((a,b)=>new Date(b.multiplier_until)-new Date(a.multiplier_until))[0]?.multiplier_until;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function icon(name){return ({book:'▤',private:'▣',journey:'⌁',rank:'♛',request:'◷',account:'♙',menu:'☰',bell:'♢',plus:'＋'}[name]||'•')}

async function loadDataLegacy(){
  if(!supabase||state.demoMode){Object.assign(state,{books:demo.books,profiles:demo.profiles,loans:demo.loans,requests:demo.requests});return}
  const [b,p,l,r]=await Promise.all([supabase.from('books').select('*').order('created_at',{ascending:false}),supabase.from('profiles').select('*'),supabase.from('loans').select('*'),supabase.from('book_requests').select('*').order('created_at',{ascending:false})]);
  if(b.error) return toast('تعذر تحميل البيانات'); Object.assign(state,{books:b.data,profiles:p.data,loans:l.data,requests:r.data});
}
function loginView(){
  $('#app').innerHTML=`<main class="login-page"><section class="login-art"><div class="login-brand"><div class="brand-mark">۞</div><div><h1>مكتبة حلقة مسجد النملة</h1><small>نقرأ لنرتقي</small></div></div><div class="quote"><h2>خيرُ جليسٍ<br>في الزمانِ كتابُ</h2><p>منصة تجمع طلاب الحلقة بكتبهم، وتحوّل كل صفحة يقرؤونها إلى خطوة في طريق المعرفة.</p></div><small>حلقة مسجد النملة المسائية · جميع الحقوق محفوظة</small></section><section class="login-box"><form class="login-form" id="loginForm"><h2>مرحبًا بعودتك</h2><p>سجّل دخولك برقم الجوال للوصول إلى مكتبة الحلقة</p><div class="form"><div class="field"><label>رقم الجوال</label><input name="phone" type="tel" inputmode="tel" dir="ltr" placeholder="05xxxxxxxx" autocomplete="tel" required></div><div class="field"><label>كلمة المرور</label><input name="password" type="password" placeholder="••••••••" autocomplete="current-password" required></div><button class="btn">تسجيل الدخول</button><div class="demo-entry hidden" id="demoEntry"><span>لا تملك حسابًا؟ استكشف النظام ببيانات آمنة.</span><button type="button" class="btn ghost" id="demoLoginBtn">الدخول التجريبي</button></div></div></form></section></main>`;
  $('#loginForm').onsubmit=login;
  $('#demoLoginBtn').onclick=demoRoleView;
}
function normalizePhone(value){const digits=String(value).replace(/\D/g,'');if(digits.startsWith('00966'))return `+${digits.slice(2)}`;if(digits.startsWith('966'))return `+${digits}`;if(digits.startsWith('05'))return `+966${digits.slice(1)}`;if(digits.startsWith('5'))return `+966${digits}`;return String(value).trim()}
function phoneLoginEmail(value){const digits=normalizePhone(value).replace(/\D/g,'');const local=digits.startsWith('966')?`0${digits.slice(3)}`:digits;return `${local}@students.alnamlah.local`}
async function login(e){e.preventDefault();if(!supabase)return toast('تعذر الاتصال بالخادم');const fd=new FormData(e.currentTarget),email=phoneLoginEmail(fd.get('phone')),{data,error}=await supabase.auth.signInWithPassword({email,password:fd.get('password')});if(error){$('#demoEntry')?.classList.remove('hidden');return toast('رقم الجوال أو كلمة المرور غير صحيحة')}const {data:profile,error:profileError}=await supabase.from('profiles').select('*').eq('id',data.user.id).single();if(profileError){$('#demoEntry')?.classList.remove('hidden');return toast('تعذر تحميل الحساب')}state.user=profile;state.role=profile.role;if(profile.must_change_password)return passwordChangeView();await loadData();render()}
function demoRoleView(){
  $('#app').innerHTML=`<main class="demo-role-page"><section class="demo-role-card"><div class="brand-mark">۞</div><span class="demo-badge">تجربة آمنة</span><h2>كيف تريد استكشاف المكتبة؟</h2><p>اختر نوع الحساب. كل ما تفعله هنا تجريبي ولن يغيّر بيانات المكتبة الحقيقية.</p><div class="demo-role-grid"><button class="demo-role-option" data-demo-role="admin"><b>♙ تجربة المشرف</b><span>أضف الكتب، راجع الطلبات، تابع الطلاب وغيّر أهدافهم.</span></button><button class="demo-role-option" data-demo-role="student"><b>▣ تجربة الطالب</b><span>اطلب كتابًا، سجّل القراءة، شاهد المسيرة والنقاط.</span></button></div><button class="link-btn" id="backToLogin">العودة لتسجيل الدخول</button></section></main>`;
  document.querySelectorAll('[data-demo-role]').forEach(button=>button.onclick=()=>startDemo(button.dataset.demoRole));
  $('#backToLogin').onclick=loginView;
}
function startDemo(role){
  const sample=structuredClone(demo),user=role==='admin'?sample.profiles.find(p=>p.id==='demo-admin'):sample.profiles.find(p=>p.id==='s1');
  state={user,role,page:'public',books:sample.books,profiles:sample.profiles,loans:sample.loans,requests:sample.requests,reviews:sample.reviews,modal:null,demoMode:true};
  render();toast(role==='admin'?'أنت الآن في تجربة المشرف':'أنت الآن في تجربة الطالب');
}
function passwordChangeView(){
  $('#app').innerHTML=`<main class="login-page"><section class="login-art"><div class="login-brand"><div class="brand-mark">۞</div><div><h1>مكتبة حلقة مسجد النملة</h1><small>حماية حسابك أولًا</small></div></div><div class="quote"><h2>كلمة مرورك<br>مفتاح حسابك</h2><p>اختر كلمة لا يعرفها أحد غيرك، ولا تستخدم كلمة المرور المؤقتة مرة أخرى.</p></div><small>لن تتمكن من دخول المكتبة قبل إتمام هذه الخطوة</small></section><section class="login-box"><form class="login-form" id="passwordForm"><h2>أنشئ كلمة مرور جديدة</h2><p>هذا أول دخول لك، لذلك يجب تغيير كلمة المرور المؤقتة.</p><div class="notice">استخدم 8 أحرف على الأقل، ويفضل الجمع بين الحروف والأرقام.</div><div class="form"><div class="field"><label>كلمة المرور الجديدة</label><input name="password" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label>تأكيد كلمة المرور</label><input name="confirm" type="password" minlength="8" autocomplete="new-password" required></div><button class="btn">حفظ ودخول المكتبة</button></div></form></section></main>`;
  $('#passwordForm').onsubmit=changeFirstPassword;
}
async function changeFirstPassword(e){e.preventDefault();const fd=new FormData(e.currentTarget),password=fd.get('password');if(password!==fd.get('confirm'))return toast('كلمتا المرور غير متطابقتين');if(password.length<8)return toast('كلمة المرور يجب ألا تقل عن 8 أحرف');const {error}=await supabase.auth.updateUser({password});if(error)return toast('تعذر تغيير كلمة المرور');const {error:flagError}=await supabase.rpc('mark_password_changed');if(flagError)return toast('تم تغيير الكلمة، لكن تعذر إكمال تهيئة الحساب');state.user.must_change_password=false;await loadData();toast('تم حفظ كلمة المرور الجديدة');render()}
function navItems(){const base=[['public','book','المكتبة العامة'],['leaderboard','rank','لوحة المتصدرين'],['requests','request','الطلبات']];if(state.role==='student')base.splice(1,0,['private','private','مكتبتي الخاصة'],['journey','journey','المسيرة']);if(state.role==='admin'){base.splice(1,0,['journey','journey','مسيرة الطلاب']);base.push(['accounts','account','الحسابات'])}return base}
function shell(){
  const pending=state.role==='admin'?state.requests.filter(r=>r.status==='pending').length:state.requests.filter(r=>r.student_id===state.user.id&&r.status==='pending').length;
  $('#app').innerHTML=`<div class="shell"><aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark">۞</div><div><h1>مكتبة حلقة مسجد النملة</h1><span>نقرأ لنرتقي</span></div></div><nav class="nav">${navItems().map(([p,i,n])=>`<button data-page="${p}" class="${state.page===p?'active':''}"><span>${icon(i)}</span>${n}${p==='requests'&&pending?`<b class="count">${pending}</b>`:''}</button>`).join('')}</nav><div class="user-mini"><div class="avatar">${esc(state.user.name[0])}</div><div><strong>${esc(state.user.name)}</strong><small>${state.role==='admin'?'مشرف المكتبة':'طالب في الحلقة'}</small></div><button class="logout" title="تسجيل الخروج">↪</button></div></aside><main class="main"><div class="mobile-head"><b>مكتبة الحلقة</b><button id="menuBtn">☰</button></div>${state.demoMode?'<div class="demo-mode-bar"><b>الوضع التجريبي</b><span>جرّب جميع الميزات بحرية؛ لن تُحفظ هذه التغييرات.</span></div>':''}<header class="topbar"><div><h2>${pageTitle()}</h2><p>${pageSubtitle()}</p></div><div class="top-actions"><button class="icon-btn">${icon('bell')}</button>${state.role==='admin'&&state.page==='public'?`<button class="btn" data-action="add-book">${icon('plus')} إضافة كتاب</button>`:''}</div></header><section id="content"></section></main></div>${modalView()}`;
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;state.modal=null;shell();renderPage()});$('.logout').onclick=async()=>{if(supabase&&!state.demoMode)await supabase.auth.signOut();state={user:null,role:null,page:'public',books:[],profiles:[],loans:[],requests:[],reviews:[],modal:null,demoMode:false};loginView()};$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');bindGlobal();renderPage();
}
function pageTitle(){if(state.page==='journey'&&state.role==='admin')return 'مسيرة الطلاب';return {public:'المكتبة العامة',private:'مكتبتي الخاصة',journey:'المسيرة',leaderboard:'لوحة المتصدرين',requests:'طلبات الكتب',accounts:'إدارة الحسابات'}[state.page]}
function pageSubtitle(){if(state.page==='journey'&&state.role==='admin')return 'استعرض إنجاز كل طالب والكتب التي أتم قراءتها';return {public:'استكشف كتب الحلقة واختر قراءتك القادمة',private:'تابع تقدمك في الكتب الموجودة لديك',journey:'سجل إنجازاتك والكتب التي أتممت قراءتها',leaderboard:'تنافس في القراءة، وارتقِ كل أسبوع',requests:state.role==='admin'?'راجع طلبات الطلاب واتخذ القرار':'تابع حالة طلباتك السابقة',accounts:'أضف الطلاب والمشرفين وتابع تهيئة حساباتهم'}[state.page]}
function renderLegacy(){shell()}
function renderPage(){const c=$('#content');if(state.page==='public')c.innerHTML=publicView();if(state.page==='private')c.innerHTML=privateView();if(state.page==='journey')c.innerHTML=journeyView();if(state.page==='leaderboard')c.innerHTML=leaderboardView();if(state.page==='requests')c.innerHTML=requestsView();if(state.page==='accounts')c.innerHTML=accountsView();bindPage();if(state.page==='accounts')bindAccounts()}
function publicViewLegacy(){const total=state.books.reduce((s,b)=>s+b.quantity,0);return `<div class="hero"><div><h3>أهلاً بك، ${esc(state.user.name.split(' ')[0])} 👋</h3><p>${state.role==='admin'?'أدر كتب الحلقة وتابع حركة الاستعارة من مكان واحد.':'كل صفحة تقرؤها اليوم، تبني بها مستقبلك غدًا.'}</p></div><div class="hero-stats"><div class="hero-stat"><strong>${state.books.length}</strong><span>عنوانًا</span></div><div class="hero-stat"><strong>${total}</strong><span>نسخة متاحة</span></div>${state.role==='student'?`<div class="hero-stat"><strong>${state.user.points}</strong><span>نقطة</span></div>`:''}</div></div><div class="section-head"><div><h3>كتب الحلقة</h3><p>مجموعة مختارة بعناية لطلابنا</p></div>${state.role==='admin'?`<button class="btn" data-action="add-book">＋ إضافة كتاب جديد</button>`:''}</div><div class="books-grid">${state.books.map(bookCard).join('')}</div>`}
function bookCardLegacy(b){return `<article class="book-card"><div class="cover ${b.cover||'c2'}"><span>${esc(b.title)}</span></div><div class="book-info"><h4>${esc(b.title)}</h4><p>${esc(b.author)} · ${esc(b.summary)}</p><div class="book-foot"><span class="stock ${b.quantity?'':'out'}">${b.quantity?`${b.quantity} نسخ متاحة`:'غير متوفر'}</span>${state.role==='student'?`<button class="link-btn" data-request="${b.id}" ${!b.quantity?'disabled':''}>اطلب الكتاب ←</button>`:`<button class="link-btn" data-edit-book="${b.id}">تعديل</button>`}</div></div></article>`}
function privateView(){
  const loans=state.loans.filter(l=>l.student_id===state.user.id&&!l.returned_at),read=Number(state.user.pages_week||0),goal=weeklyTarget(state.user),remaining=Math.max(0,goal-read);
  return `<div class="stats-grid private-stats"><div class="stat-card"><span>الكتب لديك</span><strong>${loans.length} / 3</strong><em>${loans.length>=3?'أعد كتابًا لتتمكن من طلب غيره':`يمكنك امتلاك ${3-loans.length} كتب أخرى`}</em></div><div class="stat-card target-remaining"><span>المتبقي من هدفك الأسبوعي</span><strong>${remaining?`${remaining} صفحة`:'تم إكمال الهدف ✓'}</strong><em>${read} من ${goal} صفحة · يتجدد الأربعاء</em></div></div><div class="section-head"><div><h3>كتبي الورقية</h3><p>سجّل ما قرأته من نسختك الورقية، وسلّم الكتاب للمشرف بعد إتمامه</p></div></div>${loans.length?`<div class="books-grid">${loans.map(l=>{const b=state.books.find(x=>x.id==l.book_id),pct=Math.min(100,Math.round(l.pages_read/(b.pages||400)*100)),reviewed=state.reviews.some(r=>r.loan_id===l.id);return `<article class="book-card">${richCover(b)}<div class="book-info"><h4>${esc(b.title)}</h4><p>${l.pages_read} من ${b.pages||'—'} صفحة</p><div class="progress-row"><div class="progress"><i style="width:${pct}%"></i></div><small>${pct}%</small></div>${l.completed_at?`<div class="completed-loan"><b>✓ أنهيت الكتاب</b><span>سلّم النسخة للمشرف، وسيبقى هنا حتى يستلمها.</span>${reviewed?'<small>تم إرسال تقييمك</small>':`<button class="btn gold full-btn" data-review="${l.id}">قيّم الكتاب</button>`}</div>`:`<button class="btn ghost full-btn" data-progress="${l.id}">تسجيل القراءة</button>`}</div></article>`}).join('')}</div>`:`<div class="panel empty">▣<b>مكتبتك فارغة حاليًا</b>اطلب كتابًا من المكتبة العامة</div>`}`
}
function journeyForStudent(student){const finished=state.loans.filter(l=>l.student_id===student.id&&l.completed_at).sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at)),pages=finished.reduce((sum,l)=>sum+(state.books.find(b=>b.id==l.book_id)?.pages||l.pages_read),0);return `<div class="hero"><div><h3>${state.role==='admin'?`مسيرة ${esc(student.name)}`:'مسيرتك مع القراءة'}</h3><p>كل كتاب مكتمل شاهدٌ على رحلة جميلة من العلم والمعرفة.</p></div><div class="hero-stats"><div class="hero-stat"><strong>${finished.length}</strong><span>كتب مكتملة</span></div><div class="hero-stat"><strong>${pages}</strong><span>صفحة منجزة</span></div></div></div>${state.role==='admin'?'<button class="btn ghost journey-back" data-journey-back>← جميع الطلاب</button>':''}<div class="section-head"><div><h3>الكتب التي قرأها</h3><p>يمكنك فتح التقييم أو قراءته في أي وقت</p></div></div>${finished.length?`<div class="books-grid">${finished.map(l=>{const b=state.books.find(x=>x.id==l.book_id),review=state.reviews.find(r=>r.loan_id===l.id);return `<article class="book-card">${richCover(b)}<div class="book-info"><h4>${esc(b?.title||'كتاب')}</h4><p>${esc(b?.author||'')} · ${b?.pages||l.pages_read} صفحة</p><div class="book-foot"><span class="status approved">✓ تمت القراءة</span><small>${new Date(l.completed_at).toLocaleDateString('ar-SA')}</small></div>${review?`<div class="journey-review"><div>${stars(review.rating)} <b>${review.rating}/5</b></div>${review.note?`<p>${esc(review.note)}</p>`:'<p>تقييم بدون ملاحظة</p>'}</div>`:`<button class="btn gold full-btn" data-review="${l.id}">قيّم الكتاب</button>`}</div></article>`}).join('')}</div>`:`<div class="panel empty">⌁<b>لا توجد كتب مكتملة بعد</b></div>`}`}
function journeyView(){if(state.role==='student')return journeyForStudent(state.user);if(state.journeyStudentId){const student=state.profiles.find(p=>p.id===state.journeyStudentId);if(student)return journeyForStudent(student)}const students=state.profiles.filter(p=>p.role==='student').sort((a,b)=>a.name.localeCompare(b.name,'ar'));return `<div class="hero"><div><h3>مسيرة طلاب الحلقة</h3><p>اختر طالبًا لعرض الكتب التي أتم قراءتها وإنجازه الكامل.</p></div><div class="hero-stats"><div class="hero-stat"><strong>${students.length}</strong><span>طالبًا</span></div></div></div><div class="student-journey-grid">${students.map(p=>{const finished=state.loans.filter(l=>l.student_id===p.id&&l.completed_at),pages=finished.reduce((sum,l)=>sum+(state.books.find(b=>b.id==l.book_id)?.pages||l.pages_read),0);return `<button class="student-journey-card" data-journey-student="${p.id}"><span class="avatar">${esc(p.name[0])}</span><span><b>${esc(p.name)}</b><small>${finished.length} كتاب · ${pages} صفحة</small></span><i>←</i></button>`}).join('')}</div>`}
function leaderboardView(){const ps=[...state.profiles].filter(p=>p.role==='student').sort((a,b)=>b.points-a.points),multiplier=activeMultiplier(),until=activeMultiplierUntil();return `<div class="hero"><div><h3>فرسان القراءة</h3><p>تُحتسب النقاط فور تسجيل الصفحات، وتُصفّر النقاط وصفحات الأسبوع كل يوم أربعاء.</p></div><div class="hero-stats"><div class="hero-stat"><strong>${ps.reduce((s,p)=>s+(p.points||0),0)}</strong><span>نقطة هذا الأسبوع</span></div></div></div><div class="multiplier-banner ${multiplier>1?'active':''}"><div><b>${multiplier>1?`🔥 النقاط مضاعفة ×${multiplier}`:'مضاعف النقاط ×1'}</b><span>${multiplier>1?`كل صفحة مسجلة الآن تمنح ${multiplier} نقاط حتى ${new Date(until).toLocaleTimeString('ar-SA',{hour:'numeric',minute:'2-digit'})}`:'المشرف يستطيع تشغيل مضاعف نقاط مؤقت للطلاب.'}</span></div>${state.role==='admin'?'<button class="btn gold" data-multiplier>ضبط المضاعف والمدة</button>':''}</div><div class="section-head"><div><h3>ترتيب هذا الأسبوع</h3><p>استمر في القراءة لتصل إلى الصدارة</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>الترتيب</th><th>الطالب</th><th>صفحات الأسبوع</th><th>الهدف الأسبوعي</th><th>المتبقي على تحقيق الهدف</th><th>النقاط</th>${state.role==='admin'?'<th>التحكم</th>':''}</tr></thead><tbody>${ps.map((p,i)=>{const owned=state.loans.filter(l=>l.student_id===p.id&&!l.returned_at).length,goal=weeklyTarget(p),remaining=Math.max(0,goal-(p.pages_week||0));return `<tr><td><span class="rank ${i<3?'top':''}">${i+1}</span></td><td><div class="student-cell"><div class="avatar">${esc(p.name[0])}</div><b>${esc(p.name)}</b></div></td><td>${p.pages_week||0} صفحة</td><td>${goal} صفحة</td><td>${remaining?`${remaining} صفحة`:'✓ مكتمل'}</td><td><b>${p.points||0}</b> نقطة</td>${state.role==='admin'?`<td><div class="actions"><button class="btn ghost" data-adjust="${p.id}" data-delta="-1">−</button><button class="btn" data-adjust="${p.id}" data-delta="1">＋</button><button class="link-btn" data-target="${p.id}">تعديل الهدف الأسبوعي</button><button class="link-btn" data-library="${p.id}">مكتبته</button><button class="link-btn" data-assign="${p.id}" ${owned>=3?'disabled':''}>إعطاء كتاب</button></div></td>`:''}</tr>`}).join('')}</tbody></table></div>`}
function requestsView(){const rs=state.role==='admin'?state.requests:state.requests.filter(r=>r.student_id===state.user.id),label={pending:'قيد المعالجة',approved:'مقبول',rejected:'مرفوض'};return `<div class="table-wrap"><table class="table"><thead><tr><th>الكتاب</th>${state.role==='admin'?'<th>الطالب</th>':''}<th>الملاحظة</th><th>التاريخ</th><th>الحالة</th>${state.role==='admin'?'<th>الإجراء</th>':''}</tr></thead><tbody>${rs.length?rs.map(r=>{const b=state.books.find(x=>x.id==r.book_id),p=state.profiles.find(x=>x.id===r.student_id);return `<tr><td><b>${esc(b?.title||'كتاب محذوف')}</b></td>${state.role==='admin'?`<td>${esc(p?.name||'طالب')}</td>`:''}<td>${esc(r.note||'—')}</td><td>${new Date(r.created_at).toLocaleDateString('ar-SA')}</td><td><span class="status ${r.status}">${label[r.status]}</span></td>${state.role==='admin'?`<td>${r.status==='pending'?`<div class="actions"><button class="btn" data-decide="${r.id}" data-status="approved">قبول</button><button class="btn danger" data-decide="${r.id}" data-status="rejected">رفض</button></div>`:'—'}</td>`:''}</tr>`}).join(''):`<tr><td colspan="6" class="empty">لا توجد طلبات بعد</td></tr>`}</tbody></table></div>`}
function modalView(){if(!state.modal)return '';const m=state.modal;if(m.type==='request'){const b=state.books.find(x=>x.id==m.id);return modal(`طلب كتاب: ${esc(b.title)}`,'سيصل طلبك إلى المشرف للمراجعة.',`<input type="hidden" name="book_id" value="${b.id}"><div class="field"><label>ملاحظة للمشرف</label><textarea name="note" placeholder="لماذا ترغب في قراءة هذا الكتاب؟" required></textarea></div>`,'إرسال الطلب')};if(m.type==='progress'){const l=state.loans.find(x=>x.id==m.id),b=state.books.find(x=>x.id==l.book_id);return modal('تسجيل القراءة',`سجّل عدد الصفحات التي وصلت إليها في «${esc(b.title)}».`,`<input type="hidden" name="loan_id" value="${l.id}"><div class="field"><label>وصلت إلى الصفحة</label><input type="number" name="pages" min="${l.pages_read}" max="${b.pages||9999}" value="${l.pages_read}" required></div>`,'حفظ التقدم')};if(m.type==='book'){const b=state.books.find(x=>x.id==m.id)||{};return modal(b.id?'تعديل الكتاب':'إضافة كتاب جديد','أدخل بيانات النسخة الورقية المتوفرة للطلاب.',`<input type="hidden" name="id" value="${b.id||''}"><div class="field"><label>عنوان الكتاب</label><input name="title" value="${esc(b.title||'')}" required></div><div class="form-row"><div class="field"><label>المؤلف</label><input name="author" value="${esc(b.author||'')}" required></div><div class="field"><label>عدد الصفحات</label><input name="pages" type="number" min="1" value="${b.pages||''}" required></div></div><div class="field"><label>نبذة</label><textarea name="summary" required>${esc(b.summary||'')}</textarea></div><div class="field"><label>عدد النسخ المتوفرة</label><input name="quantity" type="number" min="0" value="${b.quantity??1}" required></div>`,'حفظ الكتاب')};if(m.type==='assign'){const p=state.profiles.find(x=>x.id===m.id),available=state.books.filter(b=>b.quantity>0);return modal('إعطاء كتاب للطالب',`أضف كتابًا مباشرة إلى مكتبة ${esc(p.name)} بدون طلب مسبق.`,`<input type="hidden" name="student_id" value="${p.id}"><div class="field"><label>الكتاب</label><select name="book_id" required><option value="">اختر كتابًا</option>${available.map(b=>`<option value="${b.id}">${esc(b.title)} (${b.quantity} متاح)</option>`).join('')}</select></div>`,'إعطاء الكتاب')};if(m.type==='target'){const p=state.profiles.find(x=>x.id===m.id);return modal('تعديل الهدف الأسبوعي',`حدد عدد الصفحات الأسبوعية المطلوبة من ${esc(p.name)}.`,`<input type="hidden" name="student_id" value="${p.id}"><div class="field"><label>عدد الصفحات أسبوعيًا</label><input name="target" type="number" min="1" max="2000" value="${weeklyTarget(p)}" required></div>`,'حفظ الهدف')};if(m.type==='multiplier'){return modal('مضاعف النقاط المؤقت','اختر المضاعف والمدة. يتغيّر رصيد النقاط فقط ولا يتغير عدد الصفحات المسجلة.',`<div class="form-row"><div class="field"><label>المضاعف</label><input name="multiplier" type="number" min="1" max="50" value="${activeMultiplier()}" required></div><div class="field"><label>المدة بالساعات</label><input name="hours" type="number" min="0.25" max="168" step="0.25" value="1" required></div></div><div class="notice">مثال: ×8 لمدة ساعة يعني أن 5 صفحات تمنح 40 نقطة، بينما تبقى الصفحات 5.</div>`,'تشغيل المضاعف')};if(m.type==='library'){const p=state.profiles.find(x=>x.id===m.id),ls=state.loans.filter(x=>x.student_id===p.id&&!x.returned_at);return `<div class="modal-backdrop"><div class="modal"><h3>مكتبة ${esc(p.name)}</h3><p>${ls.length} من 3 كتب بحوزته</p><div class="form">${ls.length?ls.map(l=>{const b=state.books.find(x=>x.id==l.book_id);return `<div class="panel"><b>${esc(b.title)}</b><p>${l.pages_read} صفحة مقروءة${l.completed_at?' · مكتمل وينتظر الاستلام':''}</p><button class="btn danger" data-return-loan="${l.id}">استلام الكتاب من الطالب</button></div>`}).join(''):'<div class="empty">لا توجد كتب</div>'}<button class="btn ghost" data-close>إغلاق</button></div></div></div>`}return ''}
function modal(title,desc,fields,submit){return `<div class="modal-backdrop"><form class="modal" id="modalForm"><h3>${title}</h3><p>${desc}</p><div class="form">${fields}<div class="modal-actions"><button type="button" class="btn ghost" data-close>إلغاء</button><button class="btn">${submit}</button></div></div></form></div>`}
function bindGlobal(){document.querySelectorAll('[data-action="add-book"]').forEach(b=>b.onclick=()=>openModal('book'));document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);const form=$('#modalForm');if(form)form.onsubmit=submitModal;const bg=$('.modal-backdrop');if(bg)bg.onclick=e=>{if(e.target===bg)closeModal()}}
function bindPageLegacy(){document.querySelectorAll('[data-request]').forEach(b=>b.onclick=()=>requestBook(Number(b.dataset.request)));document.querySelectorAll('[data-progress]').forEach(b=>b.onclick=()=>openModal('progress',Number(b.dataset.progress)));document.querySelectorAll('[data-edit-book]').forEach(b=>b.onclick=()=>openModal('book',Number(b.dataset.editBook)));document.querySelectorAll('[data-adjust]').forEach(b=>b.onclick=()=>adjustPoints(b.dataset.adjust,Number(b.dataset.delta)));document.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>openModal('target',b.dataset.target));document.querySelectorAll('[data-library]').forEach(b=>b.onclick=()=>openModal('library',b.dataset.library));document.querySelectorAll('[data-assign]').forEach(b=>b.onclick=()=>openModal('assign',b.dataset.assign));document.querySelectorAll('[data-return-loan]').forEach(b=>b.onclick=()=>adminReturnLoan(Number(b.dataset.returnLoan)));document.querySelectorAll('[data-decide]').forEach(b=>b.onclick=()=>decide(Number(b.dataset.decide),b.dataset.status));document.querySelectorAll('[data-action="add-book"]').forEach(b=>b.onclick=()=>openModal('book'))}
function openModalLegacy(type,id){state.modal={type,id};shell()}function closeModal(){state.modal=null;shell()}
function requestBook(id){
  const owned=state.loans.filter(l=>l.student_id===state.user.id&&!l.returned_at).length;
  if(owned>=3){toast('لديك 3 كتب حاليًا؛ سلّم أحدها للمشرف قبل طلب كتاب جديد');return false}
  if(state.requests.some(r=>r.student_id===state.user.id&&r.book_id==id&&r.status==='pending')){toast('لديك طلب قائم لهذا الكتاب');return false}
  showRequestModal(id);
  return true;
}
async function submitModal(e){
  e.preventDefault();
  const form=e.currentTarget;
  if(form.dataset.submitting==='true')return;
  form.dataset.submitting='true';
  const submitButton=form.querySelector('button:not([type="button"])');
  if(submitButton)submitButton.disabled=true;
  const fd=new FormData(form),type=state.modal.type;
  let completedLoanId=null;
  try{
    if(type==='request'){
      const owned=state.loans.filter(l=>l.student_id===state.user.id&&!l.returned_at).length;
      if(owned>=3)return toast('لديك 3 كتب حاليًا؛ سلّم أحدها للمشرف قبل طلب كتاب جديد');
      const row={student_id:state.user.id,book_id:Number(fd.get('book_id')),note:fd.get('note'),status:'pending',created_at:new Date().toISOString()};
      if(supabase&&!state.demoMode){const {error}=await supabase.from('book_requests').insert(row);if(error)return toast('تعذر إرسال الطلب: '+String(error.message||''));await loadData()}
      else{row.id=Date.now();state.requests.unshift(row)}
      toast('تم إرسال طلبك للمشرف');
    }
    if(type==='progress'){
      const id=Number(fd.get('loan_id')),pages=Number(fd.get('pages')),l=state.loans.find(x=>x.id===id),b=state.books.find(x=>x.id==l.book_id),delta=pages-l.pages_read,justCompleted=pages===b.pages&&!l.completed_at;
      if(delta<0||pages>b.pages)return toast('رقم الصفحة غير صحيح');
      if(supabase&&!state.demoMode){const {error}=await supabase.rpc('record_reading_progress',{loan_id:id,new_page:pages});if(error)return toast(error.message);await loadData();state.user=state.profiles.find(x=>x.id===state.user.id)||state.user}
      else{l.pages_read=pages;if(justCompleted)l.completed_at=new Date().toISOString();state.user.pages_week=(state.user.pages_week||0)+delta;state.user.points=(state.user.points||0)+(delta*activeMultiplier());const profile=state.profiles.find(x=>x.id===state.user.id);if(profile){profile.pages_week=state.user.pages_week;profile.points=state.user.points}}
      if(justCompleted)completedLoanId=id;else toast('تم تحديث تقدمك ونقاطك');
    }
    if(type==='book'){
      const id=Number(fd.get('id')),row={title:fd.get('title'),author:fd.get('author'),summary:fd.get('summary'),pages:Number(fd.get('pages')),quantity:Number(fd.get('quantity')),cover:'c'+(state.books.length%5+1)};
      if(supabase&&!state.demoMode){const q=id?supabase.from('books').update(row).eq('id',id).select().single():supabase.from('books').insert(row).select().single(),{data,error}=await q;if(error)return toast(error.message);id?Object.assign(state.books.find(x=>x.id===id),data):state.books.unshift(data)}
      else{id?Object.assign(state.books.find(x=>x.id===id),row):state.books.unshift({...row,id:Date.now()})}
      toast('تم حفظ الكتاب');
    }
    if(type==='assign'){
      const studentId=fd.get('student_id'),bookId=Number(fd.get('book_id'));
      if(supabase&&!state.demoMode){const {error}=await supabase.rpc('assign_book_to_student',{target_student_id:studentId,target_book_id:bookId});if(error)return toast(error.message);await loadData()}
      else{const book=state.books.find(x=>x.id===bookId);book.quantity--;state.loans.push({id:Date.now(),student_id:studentId,book_id:bookId,pages_read:0,completed_at:null,returned_at:null})}
      toast('تم إعطاء الكتاب للطالب');
    }
    if(type==='target'){
      const id=fd.get('student_id'),v=Number(fd.get('target'));
      if(supabase&&!state.demoMode){const {error}=await supabase.from('profiles').update({weekly_target:v}).eq('id',id);if(error)return toast(error.message)}
      state.profiles.find(x=>x.id===id).weekly_target=v;toast('تم تحديث الهدف الأسبوعي');
    }
    if(type==='multiplier'){
      const multiplier=Number(fd.get('multiplier')),minutes=Math.round(Number(fd.get('hours'))*60);
      if(multiplier<1||multiplier>50||minutes<15||minutes>10080)return toast('تحقق من المضاعف والمدة');
      if(supabase&&!state.demoMode){const {error}=await supabase.rpc('set_points_multiplier',{multiplier_value:multiplier,duration_minutes:minutes});if(error)return toast(error.message);await loadData();state.user=state.profiles.find(x=>x.id===state.user.id)||state.user}
      else{const admin=state.profiles.find(p=>p.role==='admin');admin.points_multiplier=multiplier;admin.multiplier_until=new Date(Date.now()+minutes*60000).toISOString()}
      toast(`تم تشغيل مضاعف النقاط ×${multiplier}`);
    }
    state.modal=null;shell();
    if(completedLoanId)setTimeout(()=>showCompletionModal(completedLoanId),120);
  }finally{
    form.dataset.submitting='false';
    if(submitButton)submitButton.disabled=false;
  }
}
async function adjustPoints(id,delta){const p=state.profiles.find(x=>x.id===id),v=Math.max(0,p.points+delta);if(supabase&&!state.demoMode){const {error}=await supabase.from('profiles').update({points:v}).eq('id',id);if(error)return toast(error.message)}p.points=v;renderPage()}
async function adminReturnLoan(id){if(supabase&&!state.demoMode){const {error}=await supabase.rpc('admin_return_book',{target_loan_id:id});if(error)return toast(error.message);await loadData()}else{const l=state.loans.find(x=>x.id===id),b=state.books.find(x=>x.id==l.book_id);l.returned_at=new Date().toISOString();b.quantity++}toast('تم استلام الكتاب وإعادته للمكتبة');state.modal=null;shell()}
async function decide(id,status){const r=state.requests.find(x=>x.id===id),book=state.books.find(x=>x.id==r.book_id);if(status==='approved'&&book.quantity<1)return toast('لا توجد نسخة متاحة');if(supabase&&!state.demoMode){const {error}=await supabase.rpc('decide_book_request',{request_id:id,new_status:status});if(error)return toast(error.message);await loadData()}else{r.status=status;if(status==='approved'){book.quantity--;state.loans.push({id:Date.now(),student_id:r.student_id,book_id:r.book_id,pages_read:0});const p=state.profiles.find(x=>x.id===r.student_id);p.books_count=(p.books_count||0)+1}}toast(status==='approved'?'تم قبول الطلب وتسليم الكتاب':'تم رفض الطلب');renderPage()}

async function boot(){if(supabase&&!state.demoMode){const {data:{session}}=await supabase.auth.getSession();if(session){const {data:p}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();if(p){state.user=p;state.role=p.role;if(p.must_change_password)return passwordChangeView();await loadData();return render()}}}loginView()}
boot();

function accountsView(){const users=[...state.profiles].sort((a,b)=>a.name.localeCompare(b.name,'ar')),students=users.filter(p=>p.role==='student').length,admins=users.filter(p=>p.role==='admin').length;return `<div class="hero"><div><h3>حسابات الحلقة</h3><p>أنشئ الحسابات واستعد الوصول للحساب عند نسيان كلمة المرور.</p></div><div class="hero-stats"><div class="hero-stat"><strong>${students}</strong><span>طالب</span></div><div class="hero-stat"><strong>${admins}</strong><span>مشرف</span></div></div></div><div class="section-head"><div><h3>الطلاب والمشرفون</h3><p>الحسابات المسجلة في مكتبة الحلقة</p></div><button class="btn" id="addAccountBtn">＋ إضافة حساب</button></div><div class="table-wrap"><table class="table"><thead><tr><th>الاسم</th><th>رقم الجوال</th><th>الدور</th><th>حالة كلمة المرور</th><th>الإجراء</th></tr></thead><tbody>${users.map(p=>`<tr><td><div class="student-cell"><div class="avatar">${esc(p.name[0])}</div><b>${esc(p.name)}</b></div></td><td dir="ltr">${esc(p.phone||'—')}</td><td><span class="status approved">${p.role==='admin'?'مشرف':'طالب'}</span></td><td>${p.must_change_password?'بانتظار تغيير كلمة المرور':'مفعّل'}</td><td>${p.id===state.user.id?'<span class="muted">حسابك الحالي</span>':`<div class="actions"><button class="link-btn" data-reset-account="${p.id}">استعادة كلمة المرور</button><button class="link-btn delete-link" data-delete-account="${p.id}">حذف الحساب</button></div>`}</td></tr>`).join('')}</tbody></table></div>`}
function bindAccounts(){const b=$('#addAccountBtn');if(b)b.onclick=showAccountModal;document.querySelectorAll('[data-delete-account]').forEach(button=>button.onclick=()=>deleteAccount(button.dataset.deleteAccount));document.querySelectorAll('[data-reset-account]').forEach(button=>button.onclick=()=>resetAccountPassword(button.dataset.resetAccount))}
async function resetAccountPassword(id){const profile=state.profiles.find(p=>p.id===id);if(!profile)return toast('الحساب غير موجود');if(supabase&&!state.demoMode){const {data,error}=await supabase.rpc('admin_reset_password',{target_user_id:id});if(error)return toast(error.message||'تعذر استعادة كلمة المرور');showTemporaryPassword(profile,data);await loadData()}else showTemporaryPassword(profile,'Nm!Reset12345')}
function showTemporaryPassword(profile,password){document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="resetOverlay"><div class="modal"><h3>تم إنشاء كلمة مرور مؤقتة</h3><p>أرسلها إلى ${esc(profile.name)}، وسيُطلب منه تغييرها عند تسجيل الدخول.</p><div class="notice">انسخها الآن؛ لن تظهر مرة أخرى.</div><div class="field"><label>كلمة المرور المؤقتة</label><input dir="ltr" readonly value="${esc(password)}"></div><button class="btn" id="closeReset">تم الحفظ</button></div></div>`);$('#closeReset').onclick=()=>{document.querySelector('#resetOverlay')?.remove();renderPage()}}
async function deleteAccount(id){
  if(state.role!=='admin')return toast('هذه العملية للمشرف فقط');
  if(id===state.user.id)return toast('لا يمكنك حذف حسابك الحالي');
  const profile=state.profiles.find(p=>p.id===id);
  if(!profile)return toast('الحساب غير موجود');
  if(!confirm(`هل تريد حذف حساب «${profile.name}» نهائيًا؟ سيتم حذف طلباته وسجل قراءته أيضًا.`))return;
  if(supabase&&!state.demoMode){const {error}=await supabase.rpc('admin_delete_account',{target_user_id:id});if(error)return toast(error.message||'تعذر حذف الحساب')}
  state.profiles=state.profiles.filter(p=>p.id!==id);
  state.requests=state.requests.filter(r=>r.student_id!==id);
  state.loans=state.loans.filter(l=>l.student_id!==id);
  state.reviews=state.reviews.filter(r=>r.student_id!==id);
  toast('تم حذف الحساب نهائيًا');renderPage();
}
function showAccountModal(){document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="accountOverlay"><form class="modal" id="accountForm"><h3>إضافة حساب جديد</h3><p>اختر الدور وأدخل الاسم ورقم الجوال، وسيُنشأ باسورد مؤقت تلقائيًا.</p><div class="form"><div class="field"><label>الاسم الكامل</label><input name="name" required></div><div class="field"><label>رقم الجوال</label><input name="phone" type="tel" inputmode="tel" dir="ltr" placeholder="05xxxxxxxx" required></div><div class="field"><label>نوع الحساب</label><select name="role" required><option value="student">طالب</option><option value="admin">مشرف</option></select></div><div class="modal-actions"><button type="button" class="btn ghost" id="cancelAccount">إلغاء</button><button class="btn">إنشاء الحساب</button></div></div></form></div>`);$('#cancelAccount').onclick=closeAccountModal;$('#accountOverlay').onclick=e=>{if(e.target.id==='accountOverlay')closeAccountModal()};$('#accountForm').onsubmit=createAccount}
function closeAccountModal(){document.querySelector('#accountOverlay')?.remove()}
async function createAccount(e){
  e.preventDefault();
  const form=e.currentTarget,button=form.querySelector('button[type="submit"],button:not([type])'),fd=new FormData(form);
  button.disabled=true;button.textContent='جارٍ الإنشاء...';
  let data,error;
  if(supabase&&!state.demoMode){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){button.disabled=false;button.textContent='إنشاء الحساب';return toast('انتهت جلسة الدخول، سجّل الدخول مرة أخرى')}
    ({data,error}=await supabase.functions.invoke('admin-create-user',{headers:{Authorization:`Bearer ${session.access_token}`},body:{name:fd.get('name'),phone:fd.get('phone'),role:fd.get('role')}}));
  }
  else data={name:fd.get('name'),phone:normalizePhone(fd.get('phone')).replace('+966','0'),role:fd.get('role'),temporary_password:'Nm!Demo12345'};
  if(error||data?.error){
    let message=data?.error||'تعذر إنشاء الحساب';
    if(error?.context){try{const details=await error.context.json();message=details?.error||message}catch{}}
    button.disabled=false;button.textContent='إنشاء الحساب';return toast(message);
  }
  if(state.demoMode)state.profiles.push({id:`demo-${Date.now()}`,name:data.name,phone:data.phone,role:data.role,points:0,pages_week:0,weekly_target:70,must_change_password:true});
  await loadData();
  form.innerHTML=`<h3>تم إنشاء الحساب بنجاح</h3><p>أرسل هذه البيانات إلى ${esc(data.name)}. سيُطلب منه تغيير الباسورد عند أول دخول.</p><div class="notice">احفظ الباسورد الآن؛ لن يظهر مرة أخرى.</div><div class="form"><div class="field"><label>رقم الجوال</label><input dir="ltr" readonly value="${esc(data.phone)}"></div><div class="field"><label>الباسورد المؤقت</label><input dir="ltr" readonly value="${esc(data.temporary_password)}"></div><button type="button" class="btn" id="finishAccount">تم الحفظ</button></div>`;
  $('#finishAccount').onclick=()=>{closeAccountModal();renderPage()};
}

// تقييمات الكتب، تفاصيلها، وتصنيفها وصورها.
function bookReviews(bookId){return (state.reviews||[]).filter(r=>r.book_id==bookId)}
function ratingInfo(bookId){const rows=bookReviews(bookId);return {count:rows.length,average:rows.length?rows.reduce((s,r)=>s+r.rating,0)/rows.length:0}}
function stars(value){const n=Math.round(Number(value)||0);return `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`}
function richCover(b,large=''){return b?.image_url?`<div class="cover image-cover ${large}"><img src="${esc(b.image_url)}" alt="غلاف ${esc(b.title)}"></div>`:`<div class="cover ${b?.cover||'c2'} ${large}"><span>${esc(b?.title||'كتاب')}</span></div>`}
function pendingReview(){return state.role==='student'?state.loans.find(l=>l.student_id===state.user.id&&l.completed_at&&!state.reviews.some(r=>r.loan_id===l.id)):null}

async function loadData(){
  if(state.demoMode)return;
  if(!supabase){Object.assign(state,{books:structuredClone(demo.books),profiles:structuredClone(demo.profiles),loans:structuredClone(demo.loans),requests:structuredClone(demo.requests),reviews:structuredClone(demo.reviews||[])});return}
  await supabase.rpc('refresh_weekly_scores');
  const [b,p,l,r,v]=await Promise.all([supabase.from('books').select('*').order('created_at',{ascending:false}),supabase.from('profiles').select('*'),supabase.from('loans').select('*'),supabase.from('book_requests').select('*').order('created_at',{ascending:false}),supabase.from('book_reviews').select('*').order('created_at',{ascending:false})]);
  if(b.error)return toast('تعذر تحميل البيانات');
  Object.assign(state,{books:b.data||[],profiles:p.data||[],loans:l.data||[],requests:r.data||[],reviews:v.data||[]});
}

function render(){shell();const loan=pendingReview();if(loan)setTimeout(()=>showReviewModal(loan.id),250)}

function catalogRequestCount(bookId){return state.requests.filter(r=>r.book_id==bookId).length}
function catalogResults(){const query=String(state.catalogSearch||'').trim().toLocaleLowerCase('ar'),category=state.catalogCategory||'all',sort=state.catalogSort||'requested';let books=state.books.filter(b=>(category==='all'||(b.category||'عام')===category)&&(!query||[b.title,b.author,b.category,b.summary].some(v=>String(v||'').toLocaleLowerCase('ar').includes(query))));books.sort((a,b)=>{if(sort==='rating')return ratingInfo(b.id).average-ratingInfo(a.id).average||ratingInfo(b.id).count-ratingInfo(a.id).count;if(sort==='category')return String(a.category||'عام').localeCompare(String(b.category||'عام'),'ar');if(sort==='title')return a.title.localeCompare(b.title,'ar');return catalogRequestCount(b.id)-catalogRequestCount(a.id)||ratingInfo(b.id).average-ratingInfo(a.id).average});return books}
function publicView(){const total=state.books.reduce((s,b)=>s+b.quantity,0),loan=pendingReview(),results=catalogResults(),perPage=10,totalPages=Math.max(1,Math.ceil(results.length/perPage)),page=Math.min(Math.max(1,Number(state.catalogPage)||1),totalPages),shown=results.slice((page-1)*perPage,page*perPage),categories=[...new Set(state.books.map(b=>b.category||'عام'))].sort((a,b)=>a.localeCompare(b,'ar'));state.catalogPage=page;return `<div class="hero catalog-hero"><div><h3>أهلاً بك، ${esc(firstTwoNames(state.user.name))} 👋</h3><p>${state.role==='admin'?'أدر كتب الحلقة وتابع حركة الاستعارة من مكان واحد.':'ابحث عن قراءتك القادمة بين كتب الحلقة.'}</p></div><div class="hero-stats"><div class="hero-stat"><strong>${state.books.length}</strong><span>عنوانًا</span></div><div class="hero-stat"><strong>${total}</strong><span>نسخة متاحة</span></div></div></div>${loan?`<div class="review-prompt"><div><b>أتممت كتابًا، شاركنا رأيك</b><span>يمكنك تقييمه الآن قبل تسليمه للمشرف.</span></div><button class="btn gold" data-review="${loan.id}">قيّم الكتاب الآن</button></div>`:''}<form class="catalog-tools" id="catalogSearchForm"><div class="catalog-search"><span>⌕</span><input name="search" value="${esc(state.catalogSearch||'')}" placeholder="ابحث باسم الكتاب أو المؤلف أو النوع"><button class="btn">بحث</button></div><div class="catalog-filters"><label>ترتيب حسب <select id="catalogSort"><option value="requested" ${state.catalogSort==='requested'||!state.catalogSort?'selected':''}>الأكثر طلبًا</option><option value="rating" ${state.catalogSort==='rating'?'selected':''}>الأعلى تقييمًا</option><option value="category" ${state.catalogSort==='category'?'selected':''}>حسب النوع</option><option value="title" ${state.catalogSort==='title'?'selected':''}>الاسم</option></select></label><label>النوع <select id="catalogCategory"><option value="all">كل الأنواع</option>${categories.map(c=>`<option value="${esc(c)}" ${state.catalogCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div></form><div class="section-head"><div><h3>كتب الحلقة</h3><p>${results.length} نتيجة · تظهر أفضل 10 كتب في كل صفحة</p></div>${state.role==='admin'?`<button class="btn" data-action="add-book">＋ إضافة كتاب جديد</button>`:''}</div>${shown.length?`<div class="books-grid store-grid">${shown.map(bookCard).join('')}</div>`:'<div class="panel empty"><b>لا توجد كتب مطابقة</b>جرّب كلمة بحث أو نوعًا آخر</div>'}${totalPages>1?`<nav class="pagination" aria-label="صفحات الكتب">${Array.from({length:totalPages},(_,i)=>`<button class="${page===i+1?'active':''}" data-catalog-page="${i+1}">${i+1}</button>`).join('')}</nav>`:''}${reviewsTicker()}`}

function bookCard(b){const info=ratingInfo(b.id),holders=state.loans.filter(l=>l.book_id==b.id&&!l.returned_at).length;return `<article class="book-card" data-details="${b.id}">${richCover(b)}<div class="book-info"><span class="category">${esc(b.category||'عام')}</span><h4>${esc(b.title)}</h4><p>${esc(b.author)}</p><div class="rating-summary">${stars(info.average)}<small>${info.count?`${info.average.toFixed(1)} · ${info.count} قيّم`:'لا توجد تقييمات'}</small></div><div class="card-meta"><span>${catalogRequestCount(b.id)} طلب</span><span>${holders} مع طالب</span></div><div class="book-foot"><span class="stock ${b.quantity?'':'out'}">${b.quantity?`${b.quantity} نسخ متاحة`:'غير متوفر'}</span>${state.role==='admin'?`<span class="book-admin-actions"><button class="link-btn" data-edit-book="${b.id}">تعديل</button><button class="link-btn delete-link" data-delete-book="${b.id}">حذف</button></span>`:`<button class="link-btn" data-details="${b.id}">التفاصيل والطلب ←</button>`}</div></div></article>`}

function reviewsTicker(){if(!state.reviews.length)return '';const cards=state.reviews.map(r=>{const b=state.books.find(x=>x.id==r.book_id),p=state.profiles.find(x=>x.id===r.student_id);return `<article class="review-chip"><div><b>${esc(b?.title||'كتاب')}</b>${stars(r.rating)}</div><p>${r.note?`«${esc(r.note)}»`:'تقييم بدون ملاحظة'}</p><span>${esc(p?.name||'طالب')}</span></article>`}).join('');return `<div class="section-head reviews-head"><div><h3>آراء القرّاء</h3><p>تقييمات طلاب الحلقة بعد إتمام الكتب</p></div></div><div class="reviews-marquee"><div class="reviews-track">${cards}${cards}</div></div>`}

function bindPage(){
  const searchForm=$('#catalogSearchForm');if(searchForm)searchForm.onsubmit=e=>{e.preventDefault();state.catalogSearch=new FormData(e.currentTarget).get('search');state.catalogPage=1;renderPage()};
  const sort=$('#catalogSort');if(sort)sort.onchange=()=>{state.catalogSort=sort.value;state.catalogPage=1;renderPage()};
  const category=$('#catalogCategory');if(category)category.onchange=()=>{state.catalogCategory=category.value;state.catalogPage=1;renderPage()};
  document.querySelectorAll('[data-catalog-page]').forEach(b=>b.onclick=()=>{state.catalogPage=Number(b.dataset.catalogPage);renderPage();window.scrollTo({top:0,behavior:'smooth'})});
  document.querySelectorAll('[data-journey-student]').forEach(b=>b.onclick=()=>{state.journeyStudentId=b.dataset.journeyStudent;renderPage()});
  document.querySelectorAll('[data-journey-back]').forEach(b=>b.onclick=()=>{state.journeyStudentId=null;renderPage()});
  document.querySelectorAll('[data-details]').forEach(b=>b.onclick=e=>{e.stopPropagation();showBookDetails(Number(b.dataset.details))});
  document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>showReviewModal(Number(b.dataset.review)));
  document.querySelectorAll('[data-progress]').forEach(b=>b.onclick=()=>openModal('progress',Number(b.dataset.progress)));
  document.querySelectorAll('[data-edit-book]').forEach(b=>b.onclick=e=>{e.stopPropagation();openModal('book',Number(b.dataset.editBook))});
  document.querySelectorAll('[data-delete-book]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteBook(Number(b.dataset.deleteBook))});
  document.querySelectorAll('[data-adjust]').forEach(b=>b.onclick=()=>adjustPoints(b.dataset.adjust,Number(b.dataset.delta)));
  document.querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>openModal('target',b.dataset.target));
  document.querySelectorAll('[data-multiplier]').forEach(b=>b.onclick=()=>openModal('multiplier'));
  document.querySelectorAll('[data-library]').forEach(b=>b.onclick=()=>openModal('library',b.dataset.library));
  document.querySelectorAll('[data-assign]').forEach(b=>b.onclick=()=>openModal('assign',b.dataset.assign));
  document.querySelectorAll('[data-return-loan]').forEach(b=>b.onclick=()=>adminReturnLoan(Number(b.dataset.returnLoan)));
  document.querySelectorAll('[data-decide]').forEach(b=>b.onclick=()=>decide(Number(b.dataset.decide),b.dataset.status));
  document.querySelectorAll('[data-action="add-book"]').forEach(b=>b.onclick=()=>openModal('book'));
}

async function deleteBook(id){
  if(state.role!=='admin')return toast('هذه العملية للمشرف فقط');
  const book=state.books.find(b=>b.id===id);
  if(!book)return toast('الكتاب غير موجود');
  const activeLoan=state.loans.some(l=>l.book_id===id&&!l.returned_at),pendingRequest=state.requests.some(r=>r.book_id===id&&r.status==='pending');
  if(activeLoan)return toast('لا يمكن حذف الكتاب وهناك نسخة مع طالب');
  if(pendingRequest)return toast('عالج طلبات هذا الكتاب قبل حذفه');
  if(!confirm(`هل تريد حذف كتاب «${book.title}» نهائيًا؟`))return;
  if(supabase&&!state.demoMode){const {error}=await supabase.from('books').delete().eq('id',id);if(error)return toast(error.code==='23503'?'لا يمكن حذف كتاب مرتبط بسجل قراءة سابق':'تعذر حذف الكتاب: '+error.message)}
  state.books=state.books.filter(b=>b.id!==id);
  toast('تم حذف الكتاب');renderPage();
}

function openModal(type,id){state.modal={type,id};shell();if(type==='book')enhanceBookForm(id);if(type==='request')enhanceRequestForm(id)}
function closeFeatureOverlay(){document.querySelector('#featureOverlay')?.remove()}

function showRequestModal(id){
  const b=state.books.find(x=>x.id==id),info=ratingInfo(id);if(!b)return toast('الكتاب غير موجود');
  closeFeatureOverlay();
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="requestOverlay"><form class="modal" id="requestForm"><button type="button" class="modal-x" id="closeRequest">×</button><h3>طلب كتاب: ${esc(b.title)}</h3><p>اكتب ملاحظة اختيارية، ثم أرسل الطلب إلى المشرف.</p><div class="form"><div class="request-rating">${stars(info.average)}<span>${info.count?`${info.average.toFixed(1)} من 5 · ${info.count} قيّم`:'لا توجد تقييمات بعد'}</span></div><div class="field"><label>ملاحظة للمشرف <small>(اختيارية)</small></label><textarea name="note" maxlength="600" placeholder="مثال: أرغب في قراءته هذا الأسبوع"></textarea></div><div class="modal-actions"><button type="button" class="btn ghost" id="cancelRequest">إلغاء</button><button class="btn">إرسال الطلب</button></div></div></form></div>`);
  const close=()=>document.querySelector('#requestOverlay')?.remove();
  $('#closeRequest').onclick=close;$('#cancelRequest').onclick=close;$('#requestOverlay').onclick=e=>{if(e.target.id==='requestOverlay')close()};
  $('#requestForm').onsubmit=e=>submitBookRequest(e,id);
}

async function submitBookRequest(e,id){
  e.preventDefault();const form=e.currentTarget;if(form.dataset.submitting==='true')return;
  const owned=state.loans.filter(l=>l.student_id===state.user.id&&!l.returned_at).length;
  if(owned>=3)return toast('لديك 3 كتب حاليًا؛ سلّم أحدها للمشرف قبل طلب كتاب جديد');
  form.dataset.submitting='true';const button=form.querySelector('button:not([type="button"])');if(button){button.disabled=true;button.textContent='جارٍ الإرسال…'}
  const row={student_id:state.user.id,book_id:id,note:String(new FormData(form).get('note')||'').trim(),status:'pending',created_at:new Date().toISOString()};
  try{
    if(supabase&&!state.demoMode){const {data,error}=await supabase.from('book_requests').insert(row).select().single();if(error){if(error.code==='23505')return toast('لديك طلب قائم لهذا الكتاب');return toast('تعذر إرسال الطلب: '+String(error.message||''))}state.requests.unshift(data)}
    else{row.id=Date.now();state.requests.unshift(row)}
    document.querySelector('#requestOverlay')?.remove();state.page='requests';state.modal=null;shell();toast('تم إرسال طلبك للمشرف، وهذه حالته الآن');
  }finally{form.dataset.submitting='false';if(button){button.disabled=false;button.textContent='إرسال الطلب'}}
}

function enhanceRequestForm(id){const form=$('#modalForm'),b=state.books.find(x=>x.id==id),info=ratingInfo(id);if(!form||!b)return;form.querySelector('textarea')?.removeAttribute('required');form.querySelector('.form')?.insertAdjacentHTML('afterbegin',`<div class="request-rating">${stars(info.average)}<span>${info.count?`${info.average.toFixed(1)} من 5 · ${info.count} قيّم`:'لا توجد تقييمات بعد'}</span></div>`);const label=form.querySelector('textarea')?.closest('.field')?.querySelector('label');if(label)label.innerHTML='ملاحظة للمشرف <small>(اختيارية)</small>'}

function enhanceBookForm(id){const form=$('#modalForm'),b=state.books.find(x=>x.id==id)||{};if(!form)return;form.querySelector('.form')?.insertAdjacentHTML('afterbegin',`<div class="field"><label>صورة غلاف الكتاب ${b.image_url?'<small>(اختيار صورة جديدة يستبدل الحالية)</small>':''}</label><input name="image" type="file" accept="image/jpeg,image/png,image/webp"></div><div class="field"><label>نوع الكتاب</label><input name="category" value="${esc(b.category||'')}" placeholder="أدبي، رواية، سيرة..." required></div>`);form.onsubmit=submitEnhancedBook}

async function uploadBookImage(file){if(!file||!file.size)return null;if(file.size>5*1024*1024)throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');const ext=(file.name.split('.').pop()||'jpg').toLowerCase(),path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from('book-covers').upload(path,file,{contentType:file.type});if(error)throw new Error('تعذر رفع صورة الكتاب');return supabase.storage.from('book-covers').getPublicUrl(path).data.publicUrl}

async function submitEnhancedBook(e){
  e.preventDefault();const form=e.currentTarget;if(form.dataset.submitting==='true')return;form.dataset.submitting='true';
  const button=form.querySelector('button:not([type="button"])');if(button)button.disabled=true;
  try{
    const fd=new FormData(form),id=Number(fd.get('id')),existing=state.books.find(x=>x.id===id),row={title:fd.get('title'),author:fd.get('author'),category:fd.get('category'),summary:fd.get('summary'),pages:Number(fd.get('pages')),quantity:Number(fd.get('quantity')),cover:existing?.cover||`c${state.books.length%5+1}`};
    try{const imageUrl=supabase&&!state.demoMode?await uploadBookImage(fd.get('image')):null;if(imageUrl)row.image_url=imageUrl}catch(error){return toast(error.message)}
    if(supabase&&!state.demoMode){const q=id?supabase.from('books').update(row).eq('id',id).select().single():supabase.from('books').insert(row).select().single(),{data,error}=await q;if(error)return toast(error.message);id?Object.assign(existing,data):state.books.unshift(data)}
    else{id?Object.assign(existing,row):state.books.unshift({...row,id:Date.now()})}
    toast('تم حفظ الكتاب بكل تفاصيله');state.modal=null;shell();
  }finally{form.dataset.submitting='false';if(button)button.disabled=false}
}

function showCompletionModal(loanId){
  const loan=state.loans.find(x=>x.id===loanId),book=state.books.find(x=>x.id==loan?.book_id);if(!loan||!book)return;
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="featureOverlay"><div class="modal completion-modal"><div class="completion-icon">✓</div><h3>مبارك إتمام الكتاب!</h3><p>أحسنت بإنهاء «${esc(book.title)}». أُضيف الكتاب مباشرة إلى مسيرتك واحتُسبت صفحاتك ونقاطك.</p><div class="notice">سلّم النسخة الورقية للمشرف. سيبقى الكتاب في مكتبتك الخاصة حتى يضغط المشرف «استلام الكتاب».</div><div class="modal-actions"><button class="btn ghost" id="closeFeature">لاحقًا</button><button class="btn gold" id="reviewCompletedBook">قيّم الكتاب الآن</button></div></div></div>`);
  $('#closeFeature').onclick=closeFeatureOverlay;$('#reviewCompletedBook').onclick=()=>{closeFeatureOverlay();showReviewModal(loanId)};
}

function showReviewModal(loanId){if(document.querySelector('#featureOverlay'))return;const loan=state.loans.find(x=>x.id===loanId),b=state.books.find(x=>x.id==loan?.book_id);if(!loan||!b)return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="featureOverlay"><form class="modal" id="reviewForm"><h3>قيّم كتاب: ${esc(b.title)}</h3><p>اختر تقييمك من خمس نجوم، والملاحظة اختيارية.</p><input type="hidden" name="loan_id" value="${loan.id}"><div class="form"><div class="field"><label>التقييم</label><div class="star-picker"><input id="star5" name="rating" type="radio" value="5" required><label for="star5">★</label><input id="star4" name="rating" type="radio" value="4"><label for="star4">★</label><input id="star3" name="rating" type="radio" value="3"><label for="star3">★</label><input id="star2" name="rating" type="radio" value="2"><label for="star2">★</label><input id="star1" name="rating" type="radio" value="1"><label for="star1">★</label></div></div><div class="field"><label>ملاحظتك <small>(اختيارية)</small></label><textarea name="note" maxlength="600"></textarea></div><div class="modal-actions"><button type="button" class="btn ghost" id="closeFeature">لاحقًا</button><button class="btn">نشر التقييم</button></div></div></form></div>`);$('#closeFeature').onclick=closeFeatureOverlay;$('#reviewForm').onsubmit=submitReview}

async function submitReview(e){e.preventDefault();const form=e.currentTarget;if(form.dataset.submitting==='true')return;form.dataset.submitting='true';const button=form.querySelector('button:not([type="button"])');if(button)button.disabled=true;try{const fd=new FormData(form),loanId=Number(fd.get('loan_id')),rating=Number(fd.get('rating')),note=String(fd.get('note')||'').trim(),loan=state.loans.find(x=>x.id===loanId);if(supabase&&!state.demoMode){const {error}=await supabase.rpc('submit_book_review',{target_loan_id:loanId,stars_value:rating,review_note:note});if(error)return toast(error.message);await loadData()}else state.reviews.unshift({id:Date.now(),loan_id:loanId,student_id:state.user.id,book_id:loan.book_id,rating,note});closeFeatureOverlay();toast('شكرًا، تم نشر تقييمك');shell()}finally{form.dataset.submitting='false';if(button)button.disabled=false}}

function showBookDetails(id){const b=state.books.find(x=>x.id==id),rows=bookReviews(id),info=ratingInfo(id),holders=state.loans.filter(l=>l.book_id==id&&!l.returned_at).map(l=>state.profiles.find(p=>p.id===l.student_id)).filter(Boolean),owned=state.role==='student'?state.loans.filter(l=>l.student_id===state.user.id&&!l.returned_at).length:0,dailyReached=state.role==='student'&&state.requests.some(r=>r.student_id===state.user.id&&riyadhDay(r.created_at)===riyadhDay()),requestBlocked=!b.quantity||owned>=3||dailyReached,requestLabel=!b.quantity?'الكتاب غير متوفر':owned>=3?'وصلت للحد الأعلى للكتب':dailyReached?'وصلت للحد اليومي للطلبات':'طلب هذا الكتاب',requestNotice=owned>=3?'لديك 3 كتب حاليًا؛ سلّم أحدها للمشرف قبل طلب كتاب جديد.':dailyReached?'وصلت للحد اليومي للطلبات؛ يمكنك طلب كتاب جديد غدًا.':'';document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="featureOverlay"><div class="modal book-details-modal"><button class="modal-x" id="closeFeature">×</button><div class="book-details">${richCover(b,'large')}<div><span class="category">${esc(b.category||'عام')}</span><h3>${esc(b.title)}</h3><p class="author">تأليف: ${esc(b.author)}</p><div class="request-rating">${stars(info.average)}<span>${info.count?`${info.average.toFixed(1)} من 5 · ${info.count} قيّم`:'لا توجد تقييمات بعد'}</span></div><dl><div><dt>عدد الصفحات</dt><dd>${b.pages}</dd></div><div><dt>المتوفر</dt><dd>${b.quantity} نسخة</dd></div></dl><p class="summary">${esc(b.summary)}</p><div class="book-holders"><b>الكتاب موجود حاليًا مع</b>${holders.length?`<div>${holders.map(p=>`<span><i>${esc(p.name[0])}</i>${esc(p.name)}</span>`).join('')}</div>`:'<small>لا توجد نسخة مع أي طالب الآن</small>'}</div>${state.role==='student'?`${requestNotice?`<div class="notice">${requestNotice}</div>`:''}<button class="btn" id="detailRequest" ${requestBlocked?'disabled':''}>${requestLabel}</button>`:''}</div></div><div class="details-reviews"><h4>تقييمات الطلاب</h4>${rows.length?rows.map(r=>{const p=state.profiles.find(x=>x.id===r.student_id);return `<div class="detail-review"><div><b>${esc(p?.name||'طالب')}</b>${stars(r.rating)}</div>${r.note?`<p>${esc(r.note)}</p>`:''}</div>`}).join(''):'<div class="empty">لا توجد تقييمات بعد</div>'}</div></div></div>`);$('#closeFeature').onclick=closeFeatureOverlay;const request=$('#detailRequest');if(request&&!requestBlocked)request.onclick=()=>{if(requestBook(id))closeFeatureOverlay()}}
