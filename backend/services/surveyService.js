const crypto = require('node:crypto');
const { pool, all, get } = require('../database/db');
const id = () => crypto.randomUUID();

const sections = [
  ['A', 'PHẦN A. THÔNG TIN CHUNG'], ['B', 'PHẦN B. THÓI QUEN ĐỌC SÁCH VÀ MƯỢN SÁCH'],
  ['C', 'PHẦN C. MỨC ĐỘ HỨNG THÚ VÀ HÀI LÒNG'], ['D', 'PHẦN D. TRẢI NGHIỆM SỬ DỤNG VIVIORA'],
  ['E', 'PHẦN E. ĐÁNH GIÁ VỀ VIVIORA'], ['F', 'PHẦN F. Ý KIẾN CỦA EM'],
];
const q = (section, code, content, type, options = [], extra = {}) => ({ section, code, content, type, options, ...extra });
const defaultQuestions = [
  q('A','Q1','Em dang hoc khoi lop may?', 'SYSTEM'), q('A','Q2','Gioi tinh cua em?', 'SYSTEM'),
  q('A','Q3','Em co tham gia khao sat ve thoi quen doc sach lan truoc khong?', 'SINGLE',['Co','Khong','Khong nho']),
  q('B','Q4','Hien nay, em doc sach ngoai sach giao khoa bao nhieu thoi gian moi tuan?', 'SINGLE',['Khong doc','Duoi 1 gio','Tu 1-3 gio','Tu 3-5 gio','Tren 5 gio']),
  q('B','Q5','So voi truoc khi dung Viviora, thoi gian doc sach cua em thay doi the nao?', 'SINGLE',['Giam nhieu','Giam mot chut','Khong thay doi','Tang mot chut','Tang nhieu']),
  q('B','Q6','Em muon sach tai thu vien truong voi tan suat nao?', 'SINGLE',['Chua tung muon','1 lan/thang','2-3 lan/thang','1 lan/tuan','Nhieu hon 1 lan/tuan']),
  q('B','Q7','Tu khi dung Viviora, em da doc hoac muon khoang bao nhieu cuon sach?', 'SINGLE',['0 cuon','1 cuon','2 cuon','3-4 cuon','5 cuon tro len']),
  q('B','Q8','Dieu gi khien em it doc sach?', 'MULTIPLE',['Khong tim duoc sach hay, phu hop','Khong co thoi gian','Khong co thoi quen doc sach','Sach o thu vien cu, it hap dan','Thich choi game/xem dien thoai hon','Em khong gap tro ngai nao','Khac'],{maxChoices:3}),
  q('B','Q9','Em choi game voi tan suat nao?', 'SINGLE',['Khong bao gio','Thinh thoang','Thuong xuyen','Rat thuong xuyen']),
  q('C','Q10','Muc do hung thu cua em voi viec doc sach hien nay?', 'LIKERT',[],{scaleMin:1,scaleMax:5}),
  q('C','Q11','Muc do hai long cua em voi thu vien truong hien nay?', 'LIKERT',[],{scaleMin:1,scaleMax:5}),
  q('C','Q12','Nhin chung, em hai long voi Viviora o muc nao?', 'LIKERT',[],{scaleMin:1,scaleMax:5}),
  q('D','Q13','Em su dung Viviora voi tan suat nao?', 'SINGLE',['Moi vao xem 1-2 lan','Vai lan moi thang','1-2 lan moi tuan','3-5 lan moi tuan','Gan nhu moi ngay']),
  q('D','Q14','Em da su dung nhung phan he nao?', 'MULTIPLE',['Thu vien','Tro choi','Bang tin']),
  q('D','Q15','Phan he em thich nhat?', 'SINGLE',['Thu vien','Tro choi','Bang tin','Em thich nhu nhau']),
  q('D','Q16','Khi lam thu thach trong Tro choi, em thuong lam the nao?', 'SINGLE',['Doc sach ky roi moi tra loi','Doc luot hoac doc mot phan roi tra loi','Chu yeu doan hoac tim dap an o noi khac','Em chua lam thu thach nao']),
  q('D','Q17','Em co tung doc mot cuon sach ma truoc day em se khong tu chon khong?', 'SINGLE',['Co','Khong']),
  q('E','Q18','Em dong y den muc nao voi tung nhan dinh sau?', 'MATRIX',[],{scaleMin:1,scaleMax:5,rows:['Lam thu thach va tich diem giup em tien bo trong viec doc','Thu thach trong Tro choi co do kho vua suc','Em duoc tu chon cuon sach minh thich doc','Em doc sach vi em muon doc','Bang tin giup em biet them sach hay','Chia se ve sach giup em gan gui hon','Thu vien giup em de tim sach phu hop','Bang xep hang tao thi dua vui ve','Nho Viviora, em doc sach nhieu hon','Em van muon doc sach khi khong co diem hay qua','Em hieu va nho sach tot hon khi lam thu thach','Em se gioi thieu Viviora cho ban be','Viviora de su dung']}),
  q('E','Q19','Dieu gi khien em muon doc sach va dung Viviora nhat?', 'MULTIPLE',['Doi diem lay phan thuong/qua','Tich diem khi doc/muon sach','Nhan huy hieu/thanh tuu','Tao nhan vat/ho so doc gia rieng','Len cap do doc gia','Bang xep hang','Thu thach doc sach','Xem bai chia se Bang tin','Goi y sach Thu vien','Khac'],{maxChoices:3}),
  q('E','Q20','Em gap kho khan gi khi dung Viviora?', 'MULTIPLE',['Website cham hoac bi loi','Khong co thiet bi/mang thuan tien','Cau hoi, thu thach qua kho','Thieu sach em thich','Khong co thoi gian','Em khong gap kho khan nao','Khac']),
  q('F','Q21','Dieu em thich nhat o Viviora la gi?', 'TEXT',[],{required:false}), q('F','Q22','Em muon Viviora cai thien hoac bo sung dieu gi?', 'TEXT',[],{required:false}), q('F','Q23','Em muon thu vien co them sach hoac chu de nao?', 'TEXT',[],{required:false}),
];
const vietnameseContent = {
  Q1: 'Em đang học khối lớp mấy?', Q2: 'Giới tính của em?',
  Q3: 'Em có tham gia khảo sát về thói quen đọc sách lần trước (trước khi dùng Viviora) không?',
  Q4: 'Hiện nay, em đọc sách ngoài sách giáo khoa khoảng bao nhiêu thời gian mỗi tuần?',
  Q5: 'So với trước khi dùng Viviora, thời gian đọc sách của em thay đổi thế nào?',
  Q6: 'Em mượn sách tại thư viện trường với tần suất nào?',
  Q7: 'Từ khi dùng Viviora, em đã đọc hoặc mượn khoảng bao nhiêu cuốn sách?',
  Q8: 'Điều gì khiến em ít đọc sách? (Chọn tối đa 3 ý)', Q9: 'Em chơi game với tần suất nào?',
  Q10: 'Mức độ hứng thú của em với việc đọc sách hiện nay?', Q11: 'Mức độ hài lòng của em với thư viện trường hiện nay?',
  Q12: 'Nhìn chung, em hài lòng với Viviora ở mức nào?', Q13: 'Em sử dụng Viviora với tần suất nào?',
  Q14: 'Em đã sử dụng những phân hệ nào? (Chọn nhiều)', Q15: 'Phân hệ em thích nhất?',
  Q16: 'Khi làm thử thách trong phân hệ Trò chơi, em thường làm thế nào?',
  Q17: 'Em có từng đọc một cuốn sách mà trước đây em sẽ không tự chọn không?',
  Q18: 'Em đồng ý đến mức nào với từng nhận định sau?',
  Q19: 'Điều gì khiến em muốn đọc sách và dùng Viviora nhất? (Chọn tối đa 3 ý)',
  Q20: 'Em gặp khó khăn gì khi dùng Viviora? (Chọn nhiều)',
  Q21: 'Điều em thích nhất ở Viviora là gì?', Q22: 'Em muốn Viviora cải thiện hoặc bổ sung điều gì?',
  Q23: 'Em muốn thư viện có thêm sách hoặc chủ đề nào?',
};
const vietnameseOptions = {
  Q3:['Có','Không','Không nhớ'], Q4:['Không đọc','Dưới 1 giờ','Từ 1-3 giờ','Từ 3-5 giờ','Trên 5 giờ'],
  Q5:['Giảm nhiều','Giảm một chút','Không thay đổi','Tăng một chút','Tăng nhiều'], Q6:['Chưa từng mượn','1 lần/tháng','2-3 lần/tháng','1 lần/tuần','Nhiều hơn 1 lần/tuần'],
  Q7:['0 cuốn','1 cuốn','2 cuốn','3-4 cuốn','5 cuốn trở lên'], Q8:['Không tìm được sách hay, phù hợp','Không có thời gian','Không có thói quen đọc sách','Sách ở thư viện cũ, ít hấp dẫn','Thích chơi game/xem điện thoại hơn','Em không gặp trở ngại nào','Khác'],
  Q9:['Không bao giờ','Thỉnh thoảng','Thường xuyên','Rất thường xuyên'], Q13:['Mới vào xem 1-2 lần','Vài lần mỗi tháng','1-2 lần mỗi tuần','3-5 lần mỗi tuần','Gần như mỗi ngày'],
  Q14:['Thư viện','Trò chơi','Bảng tin'], Q15:['Thư viện','Trò chơi','Bảng tin','Em thích như nhau'],
  Q16:['Đọc sách kỹ rồi mới trả lời','Đọc lướt hoặc đọc một phần rồi trả lời','Chủ yếu đoán hoặc tìm đáp án ở nơi khác','Em chưa làm thử thách nào'], Q17:['Có','Không'],
  Q19:['Đổi điểm lấy phần thưởng/quà','Tích điểm khi đọc/mượn sách','Nhận huy hiệu/thành tựu','Tạo nhân vật/hồ sơ độc giả riêng','Lên cấp độ độc giả','Bảng xếp hạng độc giả tích cực','Thử thách đọc sách theo tuần/tháng','Xem bài chia sẻ trên Bảng tin','Gợi ý sách ở phân hệ Thư viện','Khác'],
  Q20:['Website chậm hoặc bị lỗi','Không có thiết bị/mạng thuận tiện','Câu hỏi, thử thách quá khó','Thiếu sách em thích','Không có thời gian','Em không gặp khó khăn nào','Khác'],
};
const vietnameseRows = ['Làm thử thách và tích điểm giúp em cảm thấy mình tiến bộ trong việc đọc.','Các thử thách trong Trò chơi có độ khó vừa sức với em.','Em được tự chọn cuốn sách mình thích đọc.','Em đọc sách vì em muốn đọc, không chỉ vì bị yêu cầu.','Bảng tin giúp em biết thêm sách hay từ bạn bè và thầy cô.','Chia sẻ và trò chuyện về sách giúp em gần gũi hơn với bạn bè, thầy cô.','Phân hệ Thư viện giúp em dễ tìm được sách phù hợp hơn trước.','Bảng xếp hạng chỉ hiện biệt danh giúp em thi đua vui vẻ, không bị áp lực.','Nhờ Viviora, em đọc sách nhiều hơn trước.','Em vẫn muốn đọc sách kể cả khi không có điểm hay quà.','Em hiểu và nhớ nội dung sách tốt hơn khi làm thử thách.','Em sẽ giới thiệu Viviora cho bạn bè.','Viviora dễ sử dụng.'];
async function ensureDefault() {
  let survey = await get("SELECT * FROM surveys WHERE status='PUBLISHED' LIMIT 1");
  if (survey) return survey;
  const existing = await get('SELECT * FROM surveys ORDER BY created_at DESC LIMIT 1');
  if (existing) return existing;
  const surveyId=id(); await pool.query("INSERT INTO surveys(id,title,introduction,is_active,status) VALUES($1,$2,$3,true,'PUBLISHED')",[surveyId,'KHẢO SÁT HỌC SINH SAU KHI SỬ DỤNG VIVIORA','Việc tham gia hoàn toàn tự nguyện. Thông tin chỉ phục vụ nghiên cứu và không ảnh hưởng kết quả học tập.']);
  const map={}; for (let i=0;i<sections.length;i++){const [key,title]=sections[i], sid=id();map[key]=sid;await pool.query('INSERT INTO survey_sections(id,survey_id,title,position) VALUES($1,$2,$3,$4)',[sid,surveyId,title,i]);}
  for (let i=0;i<defaultQuestions.length;i++){const x=defaultQuestions[i],qid=id(),options=vietnameseOptions[x.code]||x.options,rows=x.code==='Q18'?vietnameseRows:(x.rows||[]);await pool.query('INSERT INTO survey_questions(id,section_id,code,content,type,required,max_choices,scale_min,scale_max,rows,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[qid,map[x.section],x.code,vietnameseContent[x.code]||x.content,x.type,x.required!==false,x.maxChoices||null,x.scaleMin||null,x.scaleMax||null,JSON.stringify(rows),i]); for(let j=0;j<options.length;j++)await pool.query('INSERT INTO survey_options(id,question_id,label,value,position) VALUES($1,$2,$3,$4,$5)',[id(),qid,options[j],options[j],j]);}
  return get('SELECT * FROM surveys WHERE id=?',[surveyId]);
}
async function detail(surveyId) { const survey=await get('SELECT * FROM surveys WHERE id=?',[surveyId]); if(!survey)return null; const rows=await all(`SELECT s.id section_id,s.title section_title,s.position section_position,q.*,COALESCE(json_agg(json_build_object('id',o.id,'label',o.label,'value',o.value,'position',o.position) ORDER BY o.position) FILTER (WHERE o.id IS NOT NULL),'[]') options FROM survey_sections s LEFT JOIN survey_questions q ON q.section_id=s.id LEFT JOIN survey_options o ON o.question_id=q.id WHERE s.survey_id=? GROUP BY s.id,q.id ORDER BY s.position,q.position`,[surveyId]); const grouped=[]; for(const row of rows){let sec=grouped.find(x=>x.id===row.section_id);if(!sec){sec={id:row.section_id,title:row.section_title,position:row.section_position,questions:[]};grouped.push(sec)} if(row.id)sec.questions.push({...row,id:row.id,rows:row.rows||[]})} return {...survey,sections:grouped}; }
async function activeFor(user){const survey=await ensureDefault(); if(survey.status!=='PUBLISHED')return {eligible:user.role==='STUDENT',completed:false,responseId:null,survey:null}; const response=await get('SELECT id,submitted_at FROM survey_responses WHERE survey_id=? AND user_id=?',[survey.id,user.id]); return {eligible:user.role==='STUDENT',completed:!!response,responseId:response?.id||null,survey: user.role==='STUDENT'&&!response?await detail(survey.id):null};}
function validate(question,value){if(question.type==='SYSTEM')return; if(question.required&&(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length)))throw new Error(`${question.code} la bat buoc.`);if(value==null||value==='')return; if(question.type==='MULTIPLE'){if(!Array.isArray(value))throw new Error(`${question.code} khong hop le.`);if(question.max_choices&&value.length>question.max_choices)throw new Error(`${question.code} chi duoc chon toi da ${question.max_choices}.`)} if(question.type==='LIKERT'&&(!Number.isInteger(value)||value<question.scale_min||value>question.scale_max))throw new Error(`${question.code} phai tu ${question.scale_min} den ${question.scale_max}.`);if(question.type==='MATRIX'){if(typeof value!=='object'||Array.isArray(value)||question.rows.some(r=>!Number.isInteger(value[r])||value[r]<question.scale_min||value[r]>question.scale_max))throw new Error(`${question.code} chua du cac muc danh gia.`)}}
async function submit(user,answers){const status=await activeFor(user);if(!status.eligible)throw Object.assign(new Error('Chi hoc sinh moi co the nop khao sat.'),{code:'FORBIDDEN'});if(status.completed)throw Object.assign(new Error('Ban da nop khao sat.'),{code:'DUPLICATE'});const survey=status.survey;const questions=survey.sections.flatMap(s=>s.questions); for(const question of questions)validate(question,answers[question.id]);const client=await pool.connect();try{await client.query('BEGIN');const responseId=id(), grade=(user.class_name||'').match(/^[6-9]/)?.[0]||null;await client.query('INSERT INTO survey_responses(id,survey_id,user_id,class_name_snapshot,grade_snapshot,gender_snapshot) VALUES($1,$2,$3,$4,$5,$6)',[responseId,survey.id,user.id,user.class_name||null,grade,user.gender||null]);for(const question of questions){const answer=question.type==='SYSTEM'?(question.code==='Q1'?grade:user.gender||null):answers[question.id];await client.query('INSERT INTO survey_answers(id,response_id,question_id,answer,question_snapshot) VALUES($1,$2,$3,$4,$5)',[id(),responseId,question.id,JSON.stringify(answer??null),JSON.stringify({code:question.code,content:question.content,type:question.type,options:question.options,rows:question.rows})]);}await client.query('COMMIT');return {id:responseId};}catch(e){await client.query('ROLLBACK');if(e.code==='23505')throw Object.assign(new Error('Ban da nop khao sat.'),{code:'DUPLICATE'});throw e;}finally{client.release();}}
async function dashboard(surveyId){const survey=await detail(surveyId);const total=(await get("SELECT count(*)::int n FROM users WHERE role='STUDENT' AND is_active=true")).n;const responses=await all('SELECT * FROM survey_responses WHERE survey_id=?',[surveyId]);const ans=responses.length?await all('SELECT * FROM survey_answers WHERE response_id = ANY($1)',[responses.map(x=>x.id)]):[];const byQ={};for(const a of ans)(byQ[a.question_id]??=[]).push({...a,answer:a.answer});const stats={};for(const s of survey.sections)for(const question of s.questions){const values=byQ[question.id]||[];const counts={};let numeric=[];for(const v of values){if(question.type==='MULTIPLE')for(const x of (v.answer||[]))counts[x]=(counts[x]||0)+1;else if(question.type==='MATRIX')for(const x of Object.values(v.answer||{})){counts[x]=(counts[x]||0)+1;numeric.push(Number(x))}else {counts[String(v.answer)]=(counts[String(v.answer)]||0)+1;if(question.type==='LIKERT')numeric.push(Number(v.answer))}}const mean=numeric.length?numeric.reduce((a,b)=>a+b,0)/numeric.length:null;const sd=numeric.length?Math.sqrt(numeric.reduce((a,b)=>a+(b-mean)**2,0)/numeric.length):null;stats[question.id]={count:values.length,counts,mean,sd};}const behaviour=responses.length?await get(`SELECT COALESCE(sum(rp.minutes),0)::int minutes, count(DISTINCT rp.book_id)::int books, count(DISTINCT gs.id)::int game_sessions, COALESCE(sum(gs.score),0)::int game_score, count(DISTINCT p.id)::int posts, count(DISTINCT c.id)::int comments, count(DISTINCT re.id)::int reactions FROM survey_responses sr LEFT JOIN reading_progress rp ON rp.user_id=sr.user_id LEFT JOIN game_sessions gs ON gs.user_id=sr.user_id LEFT JOIN posts p ON p.author_id=sr.user_id LEFT JOIN comments c ON c.author_id=sr.user_id LEFT JOIN reactions re ON re.user_id=sr.user_id WHERE sr.survey_id=?`,[surveyId]):{};return {survey,summary:{eligible:total,completed:responses.length,completionRate:total?responses.length/total:0},stats,behaviour};}
module.exports={ensureDefault,detail,activeFor,submit,dashboard};
