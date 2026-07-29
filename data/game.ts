import {CharacterClass,Dialogue,Item,Quest,QuestObjective,Race,Settings} from '@/types/game';
export const classes:CharacterClass[]=[
{id:'warrior',name:'לוחם',description:'אמן נשק ושריון העומד בחזית.',advantage:'חוסן ושריון מוגברים',icon:'⚔️',resource:'אנרגיה'},
{id:'mage',name:'קוסם',description:'חוקר סודות הכישוף העתיק.',advantage:'עוצמת קסם גבוהה',icon:'🔮',resource:'מאנה'},
{id:'rogue',name:'נוכל',description:'זריז, ערמומי ומומחה למלכודות.',advantage:'פגיעה קריטית',icon:'🗡️',resource:'אנרגיה'},
{id:'ranger',name:'סייר',description:'גשש מיומן החי בין הפרא לציוויליזציה.',advantage:'דיוק והישרדות',icon:'🏹',resource:'אנרגיה'},
{id:'cleric',name:'כוהן',description:'מגן מרפא הנושא אור מול האפלה.',advantage:'ריפוי וברכות',icon:'✨',resource:'מאנה'},
{id:'barbarian',name:'ברברי',description:'לוחם פראי שכוחו ניזון מזעם.',advantage:'נזק וחיים גבוהים',icon:'🪓',resource:'זעם'}];
export const races:Race[]=[
{id:'human',name:'אדם',description:'סתגלן ונחוש מכל ממלכות האדם.',advantage:'תוספת לכל התכונות',icon:'👤'},
{id:'elf',name:'אלף',description:'בן לעם עתיק בעל חושים חדים.',advantage:'זריזות ותבונה',icon:'🧝'},
{id:'dwarf',name:'גמד',description:'קשוח כנחושת ההרים.',advantage:'חוסן ושריון',icon:'⛏️'},
{id:'halfling',name:'בן מחצית',description:'קטן קומה, אמיץ ובר מזל.',advantage:'מזל והתחמקות',icon:'🍀'},
{id:'orc',name:'אורק',description:'בן שבטים גאה ורב עוצמה.',advantage:'כוח ונזק',icon:'🛡️'},
{id:'dragonborn',name:'בן דרקון',description:'נושא בדמו מורשת דרקונית.',advantage:'נשיפת יסוד',icon:'🐉'}];
export const initialQuest:Quest={id:'shadows',name:'הצללים שמתחת לכפר',description:'ראש הכפר ביקש ממך לחקור את המכרה הישן ולמצוא את שלושת הכורים שנעלמו.',active:false,objectives:[['entrance','להגיע לכניסה למכרה'],['tunnel','לחקור את המנהרה הראשית'],['clue','למצוא סימן לכורים'],['guardian','להביס את שומר האבן'],['shard','לקחת את הרסיס המסתורי']].map(([id,text],i):QuestObjective=>({id,text,status:i===0?'בתהליך':'טרם התחיל'}))};
export const initialItems:Item[]=[
{id:'sword',name:'חרב ברזל',description:'להב אמין שחושל בנפחיית ערפלון.',type:'נשק',rarity:'רגיל',quantity:1,icon:'⚔️'},
{id:'potion',name:'שיקוי חיים קטן',description:'משיב 15 נקודות חיים.',type:'שיקוי',rarity:'לא שכיח',quantity:2,icon:'🧪'},
{id:'torch',name:'לפיד',description:'מאיר מנהרות חשוכות.',type:'כלי',rarity:'רגיל',quantity:1,icon:'🔥'},
{id:'map',name:'מפת המכרה',description:'מפה ישנה ועליה סימון מסתורי.',type:'משימה',rarity:'נדיר',quantity:1,icon:'🗺️'},
{id:'coins',name:'שקיק מטבעות',description:'שקיק ובו 25 מטבעות זהב.',type:'מטבע',rarity:'רגיל',quantity:25,icon:'🪙'}];
export const dialogue:Dialogue={speaker:'ראש הכפר אלרון',portrait:'👴',text:'רעידת האדמה פתחה מחדש את המכרה הישן. שלושה כורים נכנסו לשם ולא חזרו. אני צריך מישהו אמיץ שיבדוק מה קרה.',choices:[
{id:'brave',text:'״אני אמצא אותם.״',response:'ידעתי שאפשר לסמוך עליך. אנשי ערפלון יזכרו את אומץ ליבך.',effects:{reputation:2,favor:2}},
{id:'reward',text:'״מה אקבל בתמורה?״',response:'שאלה הוגנת. אוסיף חמישה עשר מטבעות למקדמה שלך.',effects:{gold:15,favor:-1}},
{id:'guards',text:'״למה אתה לא שולח את שומרי הכפר?״',response:'הם מגנים על המשפחות מפני מה שיצא מהיער. אין לי איש אחר לשלוח.',effects:{favor:-1,reputation:1}},
{id:'prepare',text:'״אני צריך זמן להתכונן.״',response:'קח את הזמן הדרוש, אך לא יותר מדי. כל שעה במכרה יקרה.',effects:{favor:1}}]};
export const defaultSettings:Settings={music:35,effects:70,textSpeed:50,animations:true};
export const story=['גשם דק יורד על גגות ערפלון. מתחת לרגליך האדמה עדיין רועדת, ופעמון הכפר קורא לתושבים להתכנס.','השביל אל המכרה מתפתל בין עצי אורן שחורים. עקבות גרירה טריים נעלמים בערפל, ומתוך הפתח עולה לחישה שאינה שייכת לעולם הזה.','בתוך המנהרה, גבישים כחולים מאירים סימן של כתר שבור. שריטה עמוקה באבן מובילה אל חלל שבו משהו זז בחשכה.'];
