-- Month 1 curriculum seed for Bright Virtual School
-- Safe to rerun. It refreshes only rows tagged with metadata.seed_pack = month1_core.

-- 1) Board and classes
INSERT INTO public.boards (code, name, description, sort_order, metadata)
VALUES (
  'TSB',
  '{"en":"Telangana State Board","hi":"तेलंगाना राज्य बोर्ड","te":"తెలంగాణ రాష్ట్ర బోర్డు"}'::jsonb,
  '{"en":"Telangana aligned KG2 bridge and Class 1 curriculum"}'::jsonb,
  1,
  '{"seed_pack":"month1_core"}'::jsonb
)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, metadata = public.boards.metadata || EXCLUDED.metadata;

WITH b AS (SELECT id FROM public.boards WHERE code = 'TSB')
INSERT INTO public.classes (board_id, code, name, description, sort_order, metadata)
SELECT b.id, v.code, v.name::jsonb, v.description::jsonb, v.sort_order, '{"seed_pack":"month1_core"}'::jsonb
FROM b,
(VALUES
  ('KG2', '{"en":"KG2 Bridge Course","hi":"KG2 ब्रिज कोर्स","te":"KG2 బ్రిడ్జ్ కోర్స్"}', '{"en":"School readiness before Class 1"}', 1),
  ('CLASS1', '{"en":"Class 1","hi":"कक्षा 1","te":"1వ తరగతి"}', '{"en":"Telangana State Board Class 1"}', 2)
) AS v(code, name, description, sort_order)
ON CONFLICT (board_id, code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, metadata = public.classes.metadata || EXCLUDED.metadata;

-- 2) Subjects
WITH c AS (SELECT id, code FROM public.classes WHERE board_id = (SELECT id FROM public.boards WHERE code = 'TSB'))
INSERT INTO public.subjects (class_id, code, name, icon, color, sort_order, metadata)
SELECT c.id, v.code, v.name::jsonb, v.icon, v.color, v.sort_order, '{"seed_pack":"month1_core"}'::jsonb
FROM c
JOIN (VALUES
  ('KG2', 'ENGLISH', '{"en":"English Readiness","hi":"अंग्रेज़ी तैयारी","te":"ఇంగ్లీష్ సిద్ధత"}', '📘', '#FFB703', 1),
  ('KG2', 'MATH', '{"en":"Mathematics Readiness","hi":"गणित तैयारी","te":"గణితం సిద్ధత"}', '🔢', '#8ECAE6', 2),
  ('KG2', 'HINDI', '{"en":"Hindi Readiness","hi":"हिंदी तैयारी","te":"హిందీ సిద్ధత"}', 'अ', '#FFC8DD', 3),
  ('KG2', 'TELUGU', '{"en":"Telugu Readiness","hi":"तेलुगु तैयारी","te":"తెలుగు సిద్ధత"}', 'అ', '#CDB4DB', 4),
  ('CLASS1', 'ENGLISH', '{"en":"English","hi":"अंग्रेज़ी","te":"ఇంగ్లీష్"}', '📘', '#FFB703', 1),
  ('CLASS1', 'MATH', '{"en":"Mathematics","hi":"गणित","te":"గణితం"}', '🔢', '#8ECAE6', 2),
  ('CLASS1', 'HINDI', '{"en":"Hindi","hi":"हिंदी","te":"హిందీ"}', 'अ', '#FFC8DD', 3),
  ('CLASS1', 'TELUGU', '{"en":"Telugu","hi":"तेलुगु","te":"తెలుగు"}', 'అ', '#CDB4DB', 4),
  ('CLASS1', 'EVS', '{"en":"EVS","hi":"पर्यावरण अध्ययन","te":"పర్యావరణ అధ్యయనం"}', '🌱', '#BDE0FE', 5)
) AS v(class_code, code, name, icon, color, sort_order) ON v.class_code = c.code
ON CONFLICT (class_id, code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order, metadata = public.subjects.metadata || EXCLUDED.metadata;

-- 3) Units
WITH s AS (
  SELECT subjects.id, subjects.code AS subject_code, classes.code AS class_code
  FROM public.subjects
  JOIN public.classes ON classes.id = subjects.class_id
  JOIN public.boards ON boards.id = classes.board_id
  WHERE boards.code = 'TSB'
)
INSERT INTO public.units (subject_id, code, title, description, sort_order, metadata)
SELECT s.id, v.unit_code, v.title::jsonb, v.description::jsonb, v.sort_order, '{"seed_pack":"month1_core"}'::jsonb
FROM s
JOIN (VALUES
  ('KG2','ENGLISH','ALPHABET','{"en":"Alphabet Fun","hi":"Alphabet अभ्यास","te":"Alphabet సరదా"}','{"en":"Recognize capital letters and sounds"}',1),
  ('KG2','MATH','NUMBERS_1_10','{"en":"Numbers 1 to 10","hi":"संख्या 1 से 10","te":"సంఖ్యలు 1 నుండి 10"}','{"en":"Count and identify numbers"}',1),
  ('KG2','HINDI','SWAR','{"en":"Hindi Vowels","hi":"स्वर","te":"హిందీ అచ్చులు"}','{"en":"Recognize basic Hindi vowels"}',1),
  ('KG2','TELUGU','ACHULU','{"en":"Telugu Vowels","hi":"तेलुगु स्वर","te":"అచ్చులు"}','{"en":"Recognize basic Telugu vowels"}',1),
  ('CLASS1','ENGLISH','VOWELS','{"en":"Vowels","hi":"Vowels","te":"Vowels"}','{"en":"Learn A, E, I, O, U"}',1),
  ('CLASS1','ENGLISH','SIMPLE_WORDS','{"en":"Simple Words","hi":"सरल शब्द","te":"సులభమైన పదాలు"}','{"en":"Read short CVC words"}',2),
  ('CLASS1','MATH','COUNTING','{"en":"Counting 1 to 10","hi":"गिनती 1 से 10","te":"లెక్కింపు 1 నుండి 10"}','{"en":"Count objects from 1 to 10"}',1),
  ('CLASS1','MATH','ADDITION','{"en":"Addition Basics","hi":"जोड़ की शुरुआत","te":"కూడిక ప్రారంభం"}','{"en":"Add objects using pictures"}',2),
  ('CLASS1','HINDI','SWAR','{"en":"Hindi Vowels","hi":"स्वर","te":"హిందీ అచ్చులు"}','{"en":"Read and write vowels"}',1),
  ('CLASS1','TELUGU','ACHULU','{"en":"Telugu Vowels","hi":"तेलुगु स्वर","te":"అచ్చులు"}','{"en":"Read and write Telugu vowels"}',1),
  ('CLASS1','EVS','MYSELF_FAMILY','{"en":"Myself and My Family","hi":"मैं और मेरा परिवार","te":"నేను మరియు నా కుటుంబం"}','{"en":"Know self and family members"}',1)
) AS v(class_code, subject_code, unit_code, title, description, sort_order)
  ON v.class_code = s.class_code AND v.subject_code = s.subject_code
ON CONFLICT (subject_id, code) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, metadata = public.units.metadata || EXCLUDED.metadata;

-- 4) Clean previous generated assignments/tests/questions from this seed pack
DELETE FROM public.assignment_submissions WHERE assignment_id IN (SELECT id FROM public.assignments WHERE metadata->>'seed_pack' = 'month1_core');
DELETE FROM public.test_attempts WHERE test_id IN (SELECT id FROM public.tests WHERE metadata->>'seed_pack' = 'month1_core');
DELETE FROM public.assignments WHERE metadata->>'seed_pack' = 'month1_core';
DELETE FROM public.tests WHERE metadata->>'seed_pack' = 'month1_core';
DELETE FROM public.question_bank WHERE metadata->>'seed_pack' = 'month1_core';

-- 5) Lessons
WITH u AS (
  SELECT units.id, units.code AS unit_code, subjects.code AS subject_code, classes.code AS class_code
  FROM public.units
  JOIN public.subjects ON subjects.id = units.subject_id
  JOIN public.classes ON classes.id = subjects.class_id
  JOIN public.boards ON boards.id = classes.board_id
  WHERE boards.code = 'TSB'
)
INSERT INTO public.lessons (unit_id, code, title, description, lesson_type, estimated_minutes, sort_order, content, metadata)
SELECT u.id, v.lesson_code, v.title::jsonb, v.description::jsonb, 'mixed'::public.lesson_type, v.minutes, v.sort_order, v.content::jsonb, '{"seed_pack":"month1_core"}'::jsonb
FROM u
JOIN (VALUES
('KG2','ENGLISH','ALPHABET','LETTER_A','{"en":"Letter A","hi":"Letter A","te":"Letter A"}','{"en":"Recognize letter A and A sound"}',10,1,
'{"steps":[
{"type":"introduction","text":{"en":"Today we will learn the letter A.","hi":"आज हम Letter A सीखेंगे.","te":"ఈరోజు మనం A అక్షరం నేర్చుకుందాం."}},
{"type":"teacher_explanation","text":{"en":"A is for Apple. A says /a/ as in apple.","hi":"A से Apple. A की ध्वनि apple में आती है.","te":"A అంటే Apple."}},
{"type":"picture_question","image_url":"https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600","question":{"en":"Which letter starts Apple?","hi":"Apple किस letter से शुरू होता है?","te":"Apple ఏ అక్షరంతో మొదలవుతుంది?"},"options":[{"en":"A"},{"en":"B"},{"en":"C"},{"en":"D"}],"answer":0,"coins":5},
{"type":"fill_blank","question":{"en":"A is for ___.","hi":"A is for ___.","te":"A is for ___."},"answer":"Apple","coins":5},
{"type":"tracing_activity","letter":"A","instructions":{"en":"Trace capital A with your finger.","hi":"अपनी उंगली से capital A trace करें.","te":"మీ వేలితో capital A ట్రేస్ చేయండి."}}
]}' ),
('KG2','ENGLISH','ALPHABET','LETTER_B','{"en":"Letter B","hi":"Letter B","te":"Letter B"}','{"en":"Recognize letter B and B sound"}',10,2,
'{"steps":[
{"type":"introduction","text":{"en":"Today we will learn the letter B.","hi":"आज हम Letter B सीखेंगे.","te":"ఈరోజు మనం B అక్షరం నేర్చుకుందాం."}},
{"type":"teacher_explanation","text":{"en":"B is for Ball. B says /b/.","hi":"B से Ball. B की ध्वनि /b/ होती है.","te":"B అంటే Ball."}},
{"type":"multiple_choice","question":{"en":"B is for ___.","hi":"B is for ___.","te":"B is for ___."},"options":[{"en":"Apple"},{"en":"Ball"},{"en":"Cat"},{"en":"Dog"}],"answer":1,"coins":5},
{"type":"tracing_activity","letter":"B","instructions":{"en":"Trace capital B.","hi":"Capital B trace करें.","te":"Capital B ట్రేస్ చేయండి."}}
]}' ),
('KG2','MATH','NUMBERS_1_10','NUMBERS_1_5','{"en":"Numbers 1 to 5","hi":"संख्या 1 से 5","te":"సంఖ్యలు 1 నుండి 5"}','{"en":"Count numbers 1 to 5"}',10,1,
'{"steps":[
{"type":"introduction","text":{"en":"Let us count from 1 to 5.","hi":"चलो 1 से 5 तक गिनते हैं.","te":"1 నుండి 5 వరకు లెక్కిద్దాం."}},
{"type":"teacher_explanation","text":{"en":"Counting tells us how many things we have.","hi":"गिनती से हमें पता चलता है कि चीजें कितनी हैं.","te":"లెక్కింపు ద్వారా వస్తువులు ఎన్ని ఉన్నాయో తెలుస్తుంది."}},
{"type":"multiple_choice","question":{"en":"How many stars? ⭐⭐⭐","hi":"कितने stars हैं? ⭐⭐⭐","te":"ఎన్ని stars ఉన్నాయి? ⭐⭐⭐"},"options":[{"en":"2"},{"en":"3"},{"en":"4"},{"en":"5"}],"answer":1,"coins":5},
{"type":"drag_drop","question":{"en":"Match number to group","hi":"संख्या को समूह से मिलाएँ","te":"సంఖ్యను సమూహంతో కలపండి"},"items":[{"en":"1"},{"en":"2"},{"en":"3"}],"targets":[{"en":"🍎"},{"en":"🍎🍎"},{"en":"🍎🍎🍎"}],"mapping":[0,1,2],"coins":5}
]}' ),
('CLASS1','ENGLISH','VOWELS','VOWELS_AEIOU','{"en":"Vowels A E I O U","hi":"Vowels A E I O U","te":"Vowels A E I O U"}','{"en":"Identify vowels in English"}',15,1,
'{"steps":[
{"type":"introduction","text":{"en":"Today we will learn vowels.","hi":"आज हम vowels सीखेंगे.","te":"ఈరోజు మనం vowels నేర్చుకుందాం."}},
{"type":"teacher_explanation","text":{"en":"The vowels are A, E, I, O and U. They help us make words.","hi":"Vowels हैं A, E, I, O और U. ये शब्द बनाने में मदद करते हैं.","te":"Vowels A, E, I, O, U. ఇవి పదాలు చేయడంలో సహాయపడతాయి."}},
{"type":"multiple_choice","question":{"en":"Which one is a vowel?","hi":"कौन सा vowel है?","te":"ఏది vowel?"},"options":[{"en":"B"},{"en":"C"},{"en":"A"},{"en":"D"}],"answer":2,"coins":5},
{"type":"match_pairs","pairs":[{"left":{"en":"A"},"right":{"en":"Apple"}},{"left":{"en":"E"},"right":{"en":"Elephant"}},{"left":{"en":"I"},"right":{"en":"Ice cream"}}],"coins":5},
{"type":"fill_blank","question":{"en":"A, E, I, O and ___ are vowels.","hi":"A, E, I, O और ___ vowels हैं.","te":"A, E, I, O మరియు ___ vowels."},"answer":"U","coins":5}
]}' ),
('CLASS1','ENGLISH','SIMPLE_WORDS','CVC_WORDS','{"en":"Simple Words: cat, bat, mat","hi":"सरल शब्द: cat, bat, mat","te":"సులభమైన పదాలు: cat, bat, mat"}','{"en":"Read short words"}',15,2,
'{"steps":[
{"type":"introduction","text":{"en":"Today we will read simple words.","hi":"आज हम simple words पढ़ेंगे.","te":"ఈరోజు సులభమైన పదాలు చదువుదాం."}},
{"type":"teacher_explanation","text":{"en":"When letters come together, they make words: c-a-t is cat.","hi":"Letters मिलकर words बनाते हैं: c-a-t is cat.","te":"అక్షరాలు కలిస్తే పదాలు అవుతాయి: c-a-t is cat."}},
{"type":"multiple_choice","question":{"en":"c-a-t makes which word?","hi":"c-a-t से कौन सा word बनता है?","te":"c-a-t ఏ పదం?"},"options":[{"en":"cat"},{"en":"bat"},{"en":"mat"},{"en":"rat"}],"answer":0,"coins":5},
{"type":"fill_blank","question":{"en":"b-a-t = ___.","hi":"b-a-t = ___.","te":"b-a-t = ___."},"answer":"bat","coins":5}
]}' ),
('CLASS1','MATH','COUNTING','COUNTING_1_10','{"en":"Counting 1 to 10","hi":"गिनती 1 से 10","te":"1 నుండి 10 వరకు లెక్కింపు"}','{"en":"Count objects up to 10"}',15,1,
'{"steps":[
{"type":"introduction","text":{"en":"Today we will count from 1 to 10.","hi":"आज हम 1 से 10 तक गिनेंगे.","te":"ఈరోజు మనం 1 నుండి 10 వరకు లెక్కిస్తాం."}},
{"type":"teacher_explanation","text":{"en":"Touch each object once while counting.","hi":"गिनते समय हर object को एक बार touch करें.","te":"లెక్కించేటప్పుడు ప్రతి వస్తువును ఒక్కసారి తాకండి."}},
{"type":"multiple_choice","question":{"en":"How many apples? 🍎🍎🍎🍎","hi":"कितने apples हैं? 🍎🍎🍎🍎","te":"ఎన్ని apples? 🍎🍎🍎🍎"},"options":[{"en":"3"},{"en":"4"},{"en":"5"},{"en":"6"}],"answer":1,"coins":5},
{"type":"fill_blank","question":{"en":"1, 2, 3, 4, ___.","hi":"1, 2, 3, 4, ___.","te":"1, 2, 3, 4, ___."},"answer":"5","coins":5}
]}' ),
('CLASS1','MATH','ADDITION','ADDITION_OBJECTS','{"en":"Addition with Objects","hi":"वस्तुओं से जोड़","te":"వస్తువులతో కూడిక"}','{"en":"Add using objects"}',15,2,
'{"steps":[
{"type":"introduction","text":{"en":"Today we will learn addition.","hi":"आज हम जोड़ सीखेंगे.","te":"ఈరోజు కూడిక నేర్చుకుందాం."}},
{"type":"teacher_explanation","text":{"en":"Addition means putting things together.","hi":"जोड़ का मतलब चीजों को एक साथ मिलाना है.","te":"కూడిక అంటే వస్తువులను కలపడం."}},
{"type":"multiple_choice","question":{"en":"2 apples + 1 apple = ?","hi":"2 apples + 1 apple = ?","te":"2 apples + 1 apple = ?"},"options":[{"en":"2"},{"en":"3"},{"en":"4"},{"en":"5"}],"answer":1,"coins":5},
{"type":"drag_drop","question":{"en":"Match the sum to answer","hi":"sum को answer से मिलाएँ","te":"సమీకరణను జవాబుతో కలపండి"},"items":[{"en":"1 + 1"},{"en":"2 + 1"},{"en":"2 + 2"}],"targets":[{"en":"2"},{"en":"3"},{"en":"4"}],"mapping":[0,1,2],"coins":5}
]}' ),
('CLASS1','EVS','MYSELF_FAMILY','MY_FAMILY','{"en":"My Family","hi":"मेरा परिवार","te":"నా కుటుంబం"}','{"en":"Identify family members"}',10,1,
'{"steps":[
{"type":"introduction","text":{"en":"Today we will learn about family.","hi":"आज हम family के बारे में सीखेंगे.","te":"ఈరోజు కుటుంబం గురించి నేర్చుకుందాం."}},
{"type":"teacher_explanation","text":{"en":"Family members love and help each other.","hi":"Family members एक-दूसरे से प्यार करते हैं और मदद करते हैं.","te":"కుటుంబ సభ్యులు ఒకరినొకరు ప్రేమించి సహాయం చేస్తారు."}},
{"type":"multiple_choice","question":{"en":"Who are family members?","hi":"Family members कौन हैं?","te":"కుటుంబ సభ్యులు ఎవరు?"},"options":[{"en":"Mother and father"},{"en":"Only toys"},{"en":"Only books"},{"en":"Only shoes"}],"answer":0,"coins":5}
]}' )
) AS v(class_code, subject_code, unit_code, lesson_code, title, description, minutes, sort_order, content)
ON v.class_code = u.class_code AND v.subject_code = u.subject_code AND v.unit_code = u.unit_code
ON CONFLICT (unit_id, code) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, estimated_minutes = EXCLUDED.estimated_minutes, sort_order = EXCLUDED.sort_order, content = EXCLUDED.content, metadata = public.lessons.metadata || EXCLUDED.metadata;

-- 6) Assignments and tests for seeded lessons
WITH l AS (
  SELECT lessons.id AS lesson_id, lessons.code AS lesson_code, lessons.unit_id, units.subject_id, units.code AS unit_code
  FROM public.lessons
  JOIN public.units ON units.id = lessons.unit_id
  WHERE lessons.metadata->>'seed_pack' = 'month1_core'
), payloads AS (
  SELECT * FROM (VALUES
  ('LETTER_A','{"en":"Letter A Homework","hi":"Letter A होमवर्क","te":"Letter A హోంవర్క్"}','[{"type":"multiple_choice","question":{"en":"A is for ___"},"options":[{"en":"Apple"},{"en":"Ball"},{"en":"Cat"},{"en":"Dog"}],"answer":0},{"type":"fill_blank","question":{"en":"Write the missing letter: ___pple"},"answer":"A"}]'::jsonb),
  ('NUMBERS_1_5','{"en":"Numbers 1 to 5 Homework","hi":"1 से 5 होमवर्क","te":"1 నుండి 5 హోంవర్క్"}','[{"type":"multiple_choice","question":{"en":"How many? ⭐⭐⭐⭐⭐"},"options":[{"en":"4"},{"en":"5"},{"en":"6"},{"en":"7"}],"answer":1},{"type":"fill_blank","question":{"en":"1, 2, 3, ___."},"answer":"4"}]'::jsonb),
  ('VOWELS_AEIOU','{"en":"Vowels Homework","hi":"Vowels होमवर्क","te":"Vowels హోంవర్క్"}','[{"type":"multiple_choice","question":{"en":"Which is a vowel?"},"options":[{"en":"B"},{"en":"A"},{"en":"C"},{"en":"D"}],"answer":1},{"type":"fill_blank","question":{"en":"A, E, I, O, ___."},"answer":"U"}]'::jsonb),
  ('COUNTING_1_10','{"en":"Counting Homework","hi":"गिनती होमवर्क","te":"లెక్కింపు హోంవర్క్"}','[{"type":"multiple_choice","question":{"en":"How many mangoes? 🥭🥭🥭"},"options":[{"en":"2"},{"en":"3"},{"en":"4"},{"en":"5"}],"answer":1},{"type":"fill_blank","question":{"en":"6, 7, 8, ___."},"answer":"9"}]'::jsonb),
  ('ADDITION_OBJECTS','{"en":"Addition Homework","hi":"जोड़ होमवर्क","te":"కూడిక హోంవర్క్"}','[{"type":"multiple_choice","question":{"en":"1 + 2 = ?"},"options":[{"en":"2"},{"en":"3"},{"en":"4"},{"en":"5"}],"answer":1},{"type":"drag_drop","question":{"en":"Match sum to answer"},"items":[{"en":"1 + 1"},{"en":"2 + 2"}],"targets":[{"en":"2"},{"en":"4"}],"mapping":[0,1]}]'::jsonb),
  ('MY_FAMILY','{"en":"My Family Homework","hi":"मेरा परिवार होमवर्क","te":"నా కుటుంబం హోంవర్క్"}','[{"type":"multiple_choice","question":{"en":"Who helps us at home?"},"options":[{"en":"Family"},{"en":"Stone"},{"en":"Chair"},{"en":"Cloud"}],"answer":0},{"type":"match_pairs","question":{"en":"Match family words"},"pairs":[{"left":{"en":"Mother"},"right":{"en":"Amma"}},{"left":{"en":"Father"},"right":{"en":"Abba"}}]}]'::jsonb)
  ) AS x(lesson_code, title, questions)
)
INSERT INTO public.assignments (lesson_id, subject_id, title, instructions, questions, pass_threshold, due_in_days, metadata)
SELECT l.lesson_id, l.subject_id, p.title::jsonb, '{"en":"Complete all questions. You can retry after submitting.","hi":"सभी प्रश्न पूरा करें. Submit के बाद retry कर सकते हैं.","te":"అన్ని ప్రశ్నలు పూర్తి చేయండి."}'::jsonb, p.questions, 60, 1, '{"seed_pack":"month1_core"}'::jsonb
FROM l JOIN payloads p ON p.lesson_code = l.lesson_code;

WITH l AS (
  SELECT lessons.id AS lesson_id, lessons.code AS lesson_code, units.subject_id, units.id AS unit_id
  FROM public.lessons
  JOIN public.units ON units.id = lessons.unit_id
  WHERE lessons.metadata->>'seed_pack' = 'month1_core'
), payloads AS (
  SELECT * FROM (VALUES
  ('VOWELS_AEIOU','{"en":"Daily Test: Vowels","hi":"Daily Test: Vowels","te":"Daily Test: Vowels"}','[{"type":"multiple_choice","question":{"en":"Select all? Which is a vowel?"},"options":[{"en":"A"},{"en":"B"},{"en":"C"},{"en":"D"}],"answer":0},{"type":"fill_blank","question":{"en":"The last vowel is ___."},"answer":"U"}]'::jsonb),
  ('COUNTING_1_10','{"en":"Daily Test: Counting","hi":"Daily Test: Counting","te":"Daily Test: Counting"}','[{"type":"multiple_choice","question":{"en":"What comes after 5?"},"options":[{"en":"4"},{"en":"5"},{"en":"6"},{"en":"7"}],"answer":2},{"type":"fill_blank","question":{"en":"1,2,3,4,5,6,7,8,9, ___."},"answer":"10"}]'::jsonb),
  ('ADDITION_OBJECTS','{"en":"Daily Test: Addition","hi":"Daily Test: Addition","te":"Daily Test: Addition"}','[{"type":"multiple_choice","question":{"en":"2 + 2 = ?"},"options":[{"en":"3"},{"en":"4"},{"en":"5"},{"en":"6"}],"answer":1},{"type":"multiple_choice","question":{"en":"1 + 3 = ?"},"options":[{"en":"2"},{"en":"3"},{"en":"4"},{"en":"5"}],"answer":2}]'::jsonb),
  ('MY_FAMILY','{"en":"Daily Test: My Family","hi":"Daily Test: My Family","te":"Daily Test: My Family"}','[{"type":"multiple_choice","question":{"en":"Family members should ___ each other."},"options":[{"en":"help"},{"en":"throw"},{"en":"hide"},{"en":"break"}],"answer":0}]'::jsonb)
  ) AS x(lesson_code, title, questions)
)
INSERT INTO public.tests (subject_id, unit_id, scope, title, description, questions, duration_minutes, pass_threshold, metadata)
SELECT l.subject_id, l.unit_id, 'daily'::public.test_scope, p.title::jsonb, '{"en":"Short daily practice test"}'::jsonb, p.questions, 5, 60, '{"seed_pack":"month1_core"}'::jsonb
FROM l JOIN payloads p ON p.lesson_code = l.lesson_code;
