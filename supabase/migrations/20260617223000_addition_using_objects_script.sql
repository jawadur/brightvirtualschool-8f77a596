-- Bright Virtual School: Lesson Script Engine content
-- Assumes you already ran:
-- alter table lesson_stages add column if not exists script jsonb default '[]'::jsonb;

-- Adds real teacher-script steps to the existing Addition Using Objects lesson.
-- Safe to rerun.

update lesson_stages
set script = '[
  {"type":"speech","text":{"en":"Good morning children.","hi":"नमस्ते बच्चों.","te":"శుభోదయం పిల్లలూ."}},
  {"type":"speech","text":{"en":"Today we will learn addition using objects.","hi":"आज हम वस्तुओं से जोड़ सीखेंगे.","te":"ఈరోజు మనం వస్తువులతో కూడిక నేర్చుకుందాం."}},
  {"type":"speech","text":{"en":"Addition means putting things together and counting the total.","hi":"जोड़ का मतलब चीजों को मिलाकर कुल गिनना है.","te":"కూడిక అంటే వస్తువులను కలిపి మొత్తం లెక్కించడం."}},
  {"type":"praise","text":{"en":"Are you ready? Let us begin.","hi":"तैयार हो? चलो शुरू करते हैं.","te":"సిద్ధమా? మొదలుపెడదాం."}}
]'::jsonb
where lesson_id = (select id from lessons where code = 'ADDITION_OBJECTS_TEACHER' limit 1)
and stage_type = 'welcome';

update lesson_stages
set script = '[
  {"type":"speech","text":{"en":"Look carefully at the blackboard.","hi":"ब्लैकबोर्ड को ध्यान से देखो.","te":"నల్లబల్లను జాగ్రత్తగా చూడండి."}},
  {"type":"draw","caption":{"en":"First group","hi":"पहला समूह","te":"మొదటి గుంపు"},"text":{"en":"First, I will draw two apples.","hi":"पहले मैं दो सेब बनाऊंगी.","te":"ముందుగా నేను రెండు ఆపిల్స్ గీయుతాను."},"primitives":[{"type":"text","text":"Addition Using Objects","x":90,"y":110,"size":42},{"type":"shape","emoji":"🍎","x":260,"y":330,"size":90},{"type":"shape","emoji":"🍎","x":370,"y":330,"size":90}]},
  {"type":"question","text":{"en":"How many apples do you see?","hi":"तुम्हें कितने सेब दिख रहे हैं?","te":"మీకు ఎన్ని ఆపిల్స్ కనిపిస్తున్నాయి?"},"options":["1","2","3","4"],"answer":"2","hint":{"en":"Count the apples one by one.","hi":"सेबों को एक-एक करके गिनो.","te":"ఆపిల్స్‌ను ఒక్కొక్కటిగా లెక్కించండి."}},
  {"type":"count","text":{"en":"Let us count together.","hi":"चलो साथ में गिनते हैं.","te":"మనము కలిసి లెక్కిద్దాం."},"values":[1,2]},
  {"type":"praise","text":{"en":"Very good. There are two apples.","hi":"बहुत अच्छा. दो सेब हैं.","te":"చాలా బాగుంది. రెండు ఆపిల్స్ ఉన్నాయి."}},
  {"type":"pause","durationSeconds":3,"text":{"en":"Think for a moment. We have two apples.","hi":"थोड़ा सोचो. हमारे पास दो सेब हैं.","te":"ఒక్కసారి ఆలోచించండి. మన దగ్గర రెండు ఆపిల్స్ ఉన్నాయి."}},
  {"type":"draw","caption":{"en":"Add one more","hi":"एक और जोड़ो","te":"ఇంకొకటి కలుపు"},"text":{"en":"Now I am adding one more apple.","hi":"अब मैं एक और सेब जोड़ रही हूँ.","te":"ఇప్పుడు నేను ఇంకొక ఆపిల్ కలుపుతున్నాను."},"primitives":[{"type":"text","text":"+","x":500,"y":350,"size":70,"color":"#fde68a"},{"type":"shape","emoji":"🍎","x":620,"y":330,"size":90}]},
  {"type":"speech","text":{"en":"When we add, we put the groups together.","hi":"जब हम जोड़ते हैं, तो हम समूहों को मिलाते हैं.","te":"కూడికలో గుంపులను కలుపుతాము."}},
  {"type":"question","text":{"en":"Now how many apples are there altogether?","hi":"अब कुल कितने सेब हैं?","te":"ఇప్పుడు మొత్తం ఎన్ని ఆపిల్స్ ఉన్నాయి?"},"options":["2","3","4","5"],"answer":"3","hint":{"en":"Count all apples from the beginning.","hi":"सभी सेबों को शुरू से गिनो.","te":"అన్ని ఆపిల్స్‌ను మొదటి నుండి లెక్కించండి."}},
  {"type":"count","text":{"en":"Count with me: one, two, three.","hi":"मेरे साथ गिनो: एक, दो, तीन.","te":"నాతో లెక్కించండి: ఒకటి, రెండు, మూడు."},"values":[1,2,3]},
  {"type":"draw","caption":{"en":"Write the answer","hi":"उत्तर लिखो","te":"సమాధానం వ్రాయి"},"text":{"en":"So two plus one equals three.","hi":"तो दो और एक मिलकर तीन होते हैं.","te":"అందుకే రెండు ప్లస్ ఒకటి మూడు అవుతుంది."},"primitives":[{"type":"equation","text":"2 + 1 = 3","x":280,"y":485},{"type":"underline","x":280,"y":515,"w":420,"color":"#fde68a"}]},
  {"type":"praise","text":{"en":"Excellent. You just did addition.","hi":"बहुत बढ़िया. तुमने अभी जोड़ किया.","te":"అద్భుతం. మీరు ఇప్పుడే కూడిక చేశారు."}},
  {"type":"speech","text":{"en":"Say it with me: two plus one equals three.","hi":"मेरे साथ बोलो: दो प्लस एक बराबर तीन.","te":"నాతో చెప్పండి: రెండు ప్లస్ ఒకటి మూడు."}},
  {"type":"pause","durationSeconds":4,"text":{"en":"Repeat it once more in your mind.","hi":"इसे मन में एक बार फिर दोहराओ.","te":"మనసులో ఇంకోసారి చెప్పుకోండి."}}
]'::jsonb
where lesson_id = (select id from lessons where code = 'ADDITION_OBJECTS_TEACHER' limit 1)
and stage_type = 'blackboard';

update lesson_stages
set script = '[
  {"type":"speech","text":{"en":"Now let us understand the idea clearly.","hi":"अब हम idea को अच्छी तरह समझते हैं.","te":"ఇప్పుడు భావాన్ని స్పష్టంగా అర్థం చేసుకుందాం."}},
  {"type":"speech","text":{"en":"Addition is used when something becomes more.","hi":"जब चीजें बढ़ती हैं, तब हम addition करते हैं.","te":"వస్తువులు పెరిగినప్పుడు మనం కూడిక చేస్తాము."}},
  {"type":"speech","text":{"en":"If you have two pencils and your mother gives one more pencil, you add.","hi":"अगर तुम्हारे पास दो pencil हैं और mother एक और pencil देती हैं, तो तुम जोड़ते हो.","te":"మీ దగ్గర రెండు పెన్సిల్స్ ఉంటే అమ్మ ఇంకొకటి ఇస్తే, మీరు కలుపుతారు."}},
  {"type":"question","text":{"en":"Does addition make the number bigger or smaller?","hi":"जोड़ में number बड़ा होता है या छोटा?","te":"కూడికలో సంఖ్య పెద్దదవుతుందా చిన్నదవుతుందా?"},"options":["Bigger","Smaller"],"answer":"Bigger","hint":{"en":"When we add, we get more.","hi":"जोड़ में चीजें बढ़ती हैं.","te":"కూడికలో వస్తువులు పెరుగుతాయి."}},
  {"type":"praise","text":{"en":"Correct. Addition usually makes the number bigger.","hi":"सही. जोड़ में number बड़ा होता है.","te":"సరైంది. కూడికలో సంఖ్య పెద్దదవుతుంది."}}
]'::jsonb
where lesson_id = (select id from lessons where code = 'ADDITION_OBJECTS_TEACHER' limit 1)
and stage_type = 'concept';

update lesson_stages
set script = '[
  {"type":"speech","text":{"en":"Let us try the first example.","hi":"चलो पहला example करते हैं.","te":"మొదటి ఉదాహరణ చూద్దాం."}},
  {"type":"draw","caption":{"en":"Example 1","hi":"उदाहरण 1","te":"ఉదాహరణ 1"},"text":{"en":"I have one star.","hi":"मेरे पास एक star है.","te":"నా దగ్గర ఒక నక్షత్రం ఉంది."},"primitives":[{"type":"text","text":"Example 1","x":90,"y":110,"size":42},{"type":"shape","emoji":"⭐","x":280,"y":330,"size":90}]},
  {"type":"draw","caption":{"en":"Add two stars","hi":"दो stars जोड़ो","te":"రెండు నక్షత్రాలు కలుపు"},"text":{"en":"I add two more stars.","hi":"मैं दो और stars जोड़ती हूँ.","te":"నేను ఇంకో రెండు నక్షత్రాలు కలుపుతాను."},"primitives":[{"type":"text","text":"+","x":420,"y":350,"size":70,"color":"#fde68a"},{"type":"shape","emoji":"⭐","x":540,"y":330,"size":90},{"type":"shape","emoji":"⭐","x":650,"y":330,"size":90}]},
  {"type":"count","text":{"en":"Count all stars.","hi":"सभी stars गिनो.","te":"అన్ని నక్షత్రాలు లెక్కించండి."},"values":[1,2,3]},
  {"type":"draw","caption":{"en":"Answer","hi":"उत्तर","te":"సమాధానం"},"text":{"en":"One plus two equals three.","hi":"एक प्लस दो बराबर तीन.","te":"ఒకటి ప్లస్ రెండు మూడు."},"primitives":[{"type":"equation","text":"1 + 2 = 3","x":280,"y":485}]},
  {"type":"praise","text":{"en":"Wonderful. You counted correctly.","hi":"बहुत अच्छा. तुमने सही गिना.","te":"చాలా బాగుంది. మీరు సరిగ్గా లెక్కించారు."}}
]'::jsonb
where lesson_id = (select id from lessons where code = 'ADDITION_OBJECTS_TEACHER' limit 1)
and stage_type = 'example1';

update lesson_stages
set script = '[
  {"type":"speech","text":{"en":"Now let us try another example.","hi":"अब दूसरा example करते हैं.","te":"ఇప్పుడు ఇంకో ఉదాహరణ చూద్దాం."}},
  {"type":"draw","caption":{"en":"Example 2","hi":"उदाहरण 2","te":"ఉదాహరణ 2"},"text":{"en":"There are three balloons.","hi":"तीन balloons हैं.","te":"మూడు బెలూన్లు ఉన్నాయి."},"primitives":[{"type":"text","text":"Example 2","x":90,"y":110,"size":42},{"type":"shape","emoji":"🎈","x":220,"y":330,"size":90},{"type":"shape","emoji":"🎈","x":330,"y":330,"size":90},{"type":"shape","emoji":"🎈","x":440,"y":330,"size":90}]},
  {"type":"draw","caption":{"en":"Add one balloon","hi":"एक balloon जोड़ो","te":"ఒక బెలూన్ కలుపు"},"text":{"en":"We add one more balloon.","hi":"हम एक और balloon जोड़ते हैं.","te":"మనము ఇంకొక బెలూన్ కలుపుతాము."},"primitives":[{"type":"text","text":"+","x":560,"y":350,"size":70,"color":"#fde68a"},{"type":"shape","emoji":"🎈","x":680,"y":330,"size":90}]},
  {"type":"question","text":{"en":"What is three plus one?","hi":"तीन प्लस एक कितना होता है?","te":"మూడు ప్లస్ ఒకటి ఎంత?"},"options":["3","4","5","6"],"answer":"4","hint":{"en":"Count all balloons.","hi":"सभी balloons गिनो.","te":"అన్ని బెలూన్లు లెక్కించండి."}},
  {"type":"count","text":{"en":"Let us count: one, two, three, four.","hi":"चलो गिनते हैं: एक, दो, तीन, चार.","te":"లెక్కిద్దాం: ఒకటి, రెండు, మూడు, నాలుగు."},"values":[1,2,3,4]},
  {"type":"draw","caption":{"en":"Answer","hi":"उत्तर","te":"సమాధానం"},"text":{"en":"Three plus one equals four.","hi":"तीन प्लस एक बराबर चार.","te":"మూడు ప్లస్ ఒకటి నాలుగు."},"primitives":[{"type":"equation","text":"3 + 1 = 4","x":280,"y":485}]},
  {"type":"praise","text":{"en":"Great job. You are ready for practice.","hi":"बहुत बढ़िया. अब तुम practice के लिए तैयार हो.","te":"అద్భుతం. ఇప్పుడు మీరు సాధనకు సిద్ధం."}}
]'::jsonb
where lesson_id = (select id from lessons where code = 'ADDITION_OBJECTS_TEACHER' limit 1)
and stage_type = 'example2';
