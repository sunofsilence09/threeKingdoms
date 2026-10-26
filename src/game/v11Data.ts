import type { HistoricalCharacter } from './historicalCharacters';
import type { CharacterAppearance, ModelWeapon } from './characters';
import type { CareerStage } from './careerData';
import type { GarrisonCommander } from './garrisonData';

type Concept = [id: string, name: string, role: string, specialty: string, equipment: string, weapon: ModelWeapon,
  speed: number, robe: number, accent: number, pose: CharacterAppearance['pose'], armor: boolean, beard: boolean, bio: string];
const concepts: Concept[] = [
  ['dian-wei','典韦','宿卫武将','护卫、勇力、近战','双戟','halberd',13,0x594037,0x9d7350,'bruiser',true,true,'陈留己吾人，先属张邈，后从夏侯惇、曹操；宛城护营力战。宽厚身躯、棕铁甲与双戟取材本传大双戟记载。'],
  ['xu-chu','许褚','虎士统领','勇力、宿卫、坚守','长刀','glaive',11,0x665a3f,0x867b60,'guard',true,false,'谯人，早年结壁自保，率众归曹操，后掌宿卫。阔面壮躯、土黄厚甲与横持长刀表现谨慎少言与勇力，兵器造型为概念设计。'],
  ['zhang-he','张郃','善阵武将','地形、营阵、机变','长枪','spear',17,0x685473,0xbd9d75,'lancer',true,true,'早从韩馥、袁绍，官渡后归曹操；以识地形、善营阵见载。紫灰轻甲、斜枪和侧身探路的姿态表现临阵应变。'],
  ['xu-huang','徐晃','持重武将','整军、步战、援军','长斧（模型借用戟形）','halberd',14,0x697575,0x9b7757,'sentinel',true,true,'早从杨奉，后归曹操，樊城解围有战功。铁灰札甲、双手长斧与收束站姿是原创军事概绘，不把演义兵器当史载定式。'],
  ['yue-jin','乐进','先登武将','先登、突击、果决','短枪','spear',18,0x73513f,0xc39b65,'scout',true,false,'本传称其容貌短小、胆烈，多次先登。矮壮身形、赭赤轻甲和前倾短枪表现其突击定位。'],
  ['yu-jin','于禁','严整武将','军纪、营垒、统军','剑与盾','swordshield',12,0x3e586d,0x9ba8aa,'shieldguard',true,true,'早从鲍信，后入曹操军；淯水退军仍整营备敌。蓝铁甲与方盾表现军纪，樊城被俘及归魏经历均保留于取材背景。'],
  ['guo-jia','郭嘉','军府谋士','料敌、察势、决策','简册','scroll',13,0x647384,0xc8b8a0,'strategist',false,false,'先见袁绍后去之，经荀彧荐入曹府为司空军祭酒。清瘦面容、雾蓝衣与指点简册的动作表现判断力。'],
  ['jia-xu','贾诩','军谋人物','审势、谋议、权变','书卷','scroll',10,0x4c4942,0xb4a280,'calm',false,true,'历董卓、李傕、段煨、张绣诸方，后归曹操。苍髯、烟褐长袍与低持书卷表现审慎，不美化其谋策带来的战乱。'],
  ['cheng-yu','程昱','东阿谋佐','守备、决断、筹策','佩剑','sword',12,0x5d6649,0xc1ad76,'leader',false,true,'东阿人，黄巾起时组织守城，后辅曹操保兖州。高瘦长髯、橄榄官袍与按剑站姿取材本传形貌与经历。'],
  ['chen-qun','陈群','制度文臣','选官、议政、律令','简册','scroll',10,0x847563,0xd5c8a8,'scholar',false,true,'曾从刘备，后入曹府，魏建国时议制度、选官。端整褐白官衣与展开的竹简表现文政身份，不将九品制写作战斗法术史实。'],
  ['ma-chao','马超','西方骑将','骑战、突锋、威势','长枪','spear',20,0xc3b58b,0x5e7f86,'lancer',true,false,'马腾之子，关中起兵失败后依张鲁，再入刘备军。浅金甲、青缨长枪与跨步姿态为原创骑战概念，非真实肖像。'],
  ['huang-zhong','黄忠','荆蜀武将','攻坚、勇毅、射击','弓与佩刀','bow',14,0x8b6b42,0xc5bfb0,'archer',true,true,'早为刘表部下，后归刘备，定军山战功卓著。灰白须发、古铜甲与厚弓是游戏概绘；本传勇毅，不照搬演义年龄与箭术比试。'],
  ['wei-yan','魏延','汉中将领','镇守、先锋、勇猛','长柄刀','glaive',16,0x633c3b,0x8c8061,'commander',true,true,'以部曲随刘备入蜀，后镇汉中；本传记善养士卒且性矜高。暗红甲、宽刃刀与昂首姿态表现个性，不采用反骨宿命。'],
  ['pang-tong','庞统','荆蜀谋士','察人、进策、军谋','书卷','scroll',11,0x81745a,0x619085,'strategist',false,true,'襄阳人，曾为周瑜功曹，后辅刘备入蜀。褐绿宽袍、厚眉与摊卷动作是原创人物构想，不按凤雏绰号设计法术。'],
  ['fa-zheng','法正','蜀中谋佐','机断、军谋、察势','佩剑','sword',13,0x4b635f,0xb68e5b,'sentinel',false,true,'扶风人，入蜀从刘璋，后参与刘备取益州、汉中谋议。墨绿袍、修髯与低垂佩剑表现冷静而强硬的谋佐形象。'],
  ['lu-su','鲁肃','江东谋佐','联络、统军、粮秣','佩剑','sword',12,0x8d765c,0xbccbb8,'greeting',false,true,'临淮东城人，助周瑜、孙权经营江东，赤壁前参与联刘。麦褐衣、短髯与伸手议事的动作表现开阔而务实的取材方向。'],
  ['lv-meng','吕蒙','江东统军','整军、谋断、军略','剑与盾','swordshield',16,0x486970,0xc0a16a,'commander',true,false,'少年从军，后勤学，接鲁肃军，取荆州。青钢甲与收盾回望的动作表现武将向统军者的变化，不以白衣渡江虚构隐身术。'],
  ['gan-ning','甘宁','江上武将','轻兵、突袭、勇猛','佩刀','sword',19,0x397b80,0xbb914a,'skulker',true,false,'巴郡人，早为游侠，历刘表、黄祖后归孙权；曾以轻兵夜袭。碧青短甲、铜铃腰饰与低身持刀取材锦帆经历，不美化劫掠。'],
  ['taishi-ci','太史慈','东莱武将','弓术、胆识、突围','长弓','bow',18,0x725f89,0xc5b394,'archer',true,true,'东莱黄县人，曾解北海之围，从刘繇后归孙策。紫蓝甲、长弓与回身瞄准取材射术，卒年不采用小说合肥战死。'],
  ['huang-gai','黄盖','孙氏宿将','水战、火攻、治事','长柄刀','glaive',12,0x92734b,0x6c7771,'bruiser',true,true,'零陵泉陵人，历孙坚、孙策、孙权，赤壁献火攻策并亲往。古铜甲、斑白胡须与稳握刀杆表现宿将，火攻是事件灵感。'],
  ['kong-rong','孔融','北海国相','文辞、礼议、交游','书卷','scroll',10,0x748890,0xd0c4a2,'scholar',false,true,'鲁人，曾任北海相，后入朝为太中大夫。灰蓝儒袍、展开书卷与长髯表现文士身份；北海是国相而非冒称郡太守。'],
  ['tao-qian','陶谦','徐州主事','州务、军政、交涉','佩剑','sword',10,0x977b65,0x72847b,'leader',false,true,'丹阳人，曾任徐州刺史、徐州牧。苍髯、暖褐官衣与扶剑站姿取材地方长官身份，徐州活动地图接点不等于东海太守。'],
  ['wang-lang','王朗','会稽文臣','经学、治事、议政','简册','scroll',10,0x51797b,0xc6b483,'greeting',false,true,'东海人，由陶谦治中出任会稽太守，孙策渡江后流移，后入曹魏朝廷。湖青官袍与持简议事是原创概绘，不采用阵前被骂死情节。'],
  ['shi-xie','士燮','交趾长官','经学、交涉、安境','书卷','scroll',9,0x9b8454,0x587b68,'calm',false,true,'苍梧广信人，任交趾太守，招纳流寓文士。土金袍与绿饰取材南方长官；籍贯广信不能变成苍梧太守，交趾未设城点。'],
  ['liu-yao','刘繇','扬州长官','州政、统军、守土','佩剑','sword',11,0x4c6e8b,0xaf997b,'commander',false,true,'东莱人，汉廷任为扬州刺史，后加牧，孙策进兵后退豫章。深海蓝官袍与分指江图的动作表现州务，不冒称豫章太守。'],
  ['huang-zu','黄祖','江夏守将','江防、守备、军务','长矛','spear',12,0x79534a,0x76908a,'guard',true,true,'刘表部下，任江夏太守，与孙氏军队交战。赤褐甲与旧铜盔、直立长矛表现江防守将，江夏未设确切郡治城点。'],
  ['gongsun-du','公孙度','辽东长官','边务、统众、威势','佩剑','sword',11,0x59526e,0xb8b0a2,'tyrant',true,true,'襄平人，由徐荣荐为辽东太守，后自立名号经营辽东。紫铁甲与灰裘、严厉目光表现边地权势，辽东未设地图城点。'],
  ['han-fu','韩馥','冀州长官','州务、筹粮、议事','简册','scroll',9,0x8e817a,0xa8b69a,'greeting',false,true,'颍川人，曾任冀州牧，让冀州于袁绍后离去。灰褐官袍、迟疑扶简的动作表现其处境，不把让州写成善战事迹。'],
  ['zhang-yang','张杨','河内长官','军务、护送、输粮','长枪','spear',13,0x786c53,0x8ba0a6,'protective',true,true,'云中人，由并州军吏至河内太守，曾输粮迎献帝。砂褐甲与浅蓝披帛、护送姿态取材本传，不把河内与河南尹混同。'],
  ['hua-xin','华歆','汉魏文臣','治政、经学、议事','书卷','scroll',10,0x688068,0xd1c2a0,'scholar',false,true,'平原人，曾任豫章太守，后经孙策、曹操军府入魏廷。青竹色袍、清瘦面容与整齐持卷动作表现文政身份。'],
  ['zhao-yu','赵昱','广陵太守','礼议、使节、地方政务','简册','scroll',10,0x88708b,0xbfb08a,'greeting',false,true,'琅邪人，由陶谦别驾奉章入长安，拜广陵太守，后为笮融所杀。梅灰官袍、执节与简册取材使节经历，兵器栏为文具概绘。'],
  ['liu-chong','刘宠','陈王','弩射、护境、统众','强弩（模型借用弓形）','bow',14,0x7b695d,0xb79756,'archer',true,true,'陈愍王，黄巾起时以强弩护境，后与国相骆俊被袁术遣客杀害。金褐甲与宽臂弩取材本传，不混同一钱太守刘宠。'],
];

export const V11_CHARACTERS: readonly HistoricalCharacter[] = concepts.map(([id,name,role,specialty,equipment,weapon,speed,robe,accent,pose,armor,beard,bio]) => ({
  id,name,gender:'male',role,specialty,equipment,weapon,speed,
  appearance:{identity:`乱世人物 · ${role}`,portrait:`/assets/characters/${id}-v1.png`,
    bio:`${bio} 造型、武学、逐年相遇地点与同行是游戏演绎；官名背景不等于连续在任证明。`,
    robe,accent,sash:accent,skin:0xc6a180,headband:null,stocky:['dian-wei','xu-chu','yue-jin'].includes(id),beard,pack:false,pose,outfit:armor?'armor':'robe',hair:armor?'bun':'crown'},
}));

/** City nodes and date spans are gameplay encounters; factual offices are identified separately below. */
const s=(from:number,to:number,cityId:string,kind:CareerStage['kind'],title:string,factionId?:string,employerId?:string):CareerStage=>({
  from:{year:from,month:1},to:{year:to,month:12},cityId,kind,title,
  office:`${title}联络处（游戏阶段，非精确连续任期）`,...(factionId?{factionId}:{}),...(employerId?{employerId}:{}),
});
const free=(from:number,to:number,city:string)=>s(from,to,city,'free','游居人物');
export const V11_CAREERS: Record<string,CareerStage[]> = {
  'dian-wei':[s(190,192,'chenliu','employed','张邈部将','han','zhang-miao'),s(193,196,'dongjun','employed','宿卫将领','cao','cao-cao'),free(197,202,'nanyang')],
  'xu-chu':[free(190,195,'runan'),s(196,219,'xuxian','employed','虎士宿卫','cao','cao-cao'),s(220,234,'henan','employed','武卫将军','cao'),free(235,240,'henan')],
  'zhang-he':[s(189,190,'ye','employed','韩馥军司马','han','han-fu'),s(191,199,'ye','employed','袁绍军将','yuan-shao','yuan-shao'),s(200,210,'xuxian','employed','曹军将领','cao','cao-cao'),s(211,231,'changan','employed','关中统军','cao'),free(232,236,'changan')],
  'xu-huang':[s(195,195,'henan','employed','杨奉军将','han'),s(196,218,'xuxian','employed','曹军将领','cao','cao-cao'),s(219,226,'xiangyang','employed','援军将领','cao'),free(227,232,'henan')],
  'yue-jin':[s(190,207,'chenliu','employed','先登将领','cao','cao-cao'),s(208,212,'xiangyang','employed','驻军将领','cao','cao-cao'),s(213,217,'shouchun','employed','合肥军务联络','cao','cao-cao'),free(218,223,'shouchun')],
  'yu-jin':[s(189,191,'dongjun','employed','鲍信部将','han'),s(192,218,'xuxian','employed','曹军将领','cao','cao-cao'),free(219,220,'jiangling'),s(221,221,'henan','employed','安远将军','cao'),free(222,226,'henan')],
  'guo-jia':[free(190,195,'yingchuan'),s(196,206,'xuxian','employed','司空军祭酒','cao','cao-cao'),free(207,212,'ji')],
  'jia-xu':[s(189,191,'henan','employed','董卓军吏','dong-zhuo'),s(192,195,'changan','employed','汉廷及李傕军议','han'),free(196,196,'changan'),s(197,198,'nanyang','employed','张绣谋佐','han'),s(199,219,'xuxian','employed','曹府谋佐','cao','cao-cao'),s(220,223,'henan','employed','太尉','cao'),free(224,228,'henan')],
  'cheng-yu':[free(184,191,'dongjun'),s(192,219,'dongjun','employed','曹府谋佐','cao','cao-cao'),s(220,220,'henan','employed','卫尉','cao'),free(221,225,'henan')],
  'chen-qun':[s(194,195,'xiapi','employed','刘备别驾','liu','liu-bei'),free(196,197,'xiapi'),s(198,219,'xuxian','employed','曹府文吏','cao','cao-cao'),s(220,237,'henan','employed','魏廷制度文臣','cao'),free(238,242,'henan')],
  'ma-chao':[s(196,210,'changan','employed','关中将领','ma-teng'),s(211,212,'jixian','employed','关西军务','ma-teng'),s(213,213,'nanzheng','employed','张鲁部将','zhang-lu','zhang-lu'),s(214,222,'shujun','employed','刘备军将','liu','liu-bei'),free(223,227,'shujun')],
  'huang-zhong':[s(208,208,'changsha','employed','长沙军将','liu-biao'),s(209,210,'changsha','employed','刘备部将','liu','liu-bei'),s(211,218,'shujun','employed','入蜀将领','liu','liu-bei'),s(219,219,'nanzheng','employed','后将军','liu','liu-bei'),free(220,225,'shujun')],
  'wei-yan':[s(211,218,'shujun','employed','入蜀部将','liu','liu-bei'),s(219,233,'nanzheng','employed','汉中镇守将领','liu'),free(234,239,'nanzheng')],
  'pang-tong':[s(209,209,'jiangling','employed','周瑜功曹','sun','zhou-yu'),s(210,210,'changsha','employed','刘备治中','liu','liu-bei'),s(211,213,'shujun','employed','军师中郎将','liu','liu-bei'),free(214,219,'shujun')],
  'fa-zheng':[s(196,210,'shujun','employed','刘璋军议','yi','liu-zhang'),s(211,220,'shujun','employed','刘备谋佐','liu','liu-bei'),free(221,225,'shujun')],
  'lu-su':[free(194,199,'shouchun'),s(200,208,'wujun','employed','孙权谋佐','sun','sun-quan'),s(209,216,'jiangling','employed','江防统领','sun','sun-quan'),free(217,222,'jiangling')],
  'lv-meng':[s(196,199,'wujun','employed','孙策部将','sun','sun-ce'),s(200,218,'wujun','employed','孙权统军','sun','sun-quan'),s(219,219,'jiangling','employed','荆州军务','sun','sun-quan'),free(220,224,'jiangling')],
  'gan-ning':[free(194,199,'jiangzhou'),s(200,206,'jiangling','employed','刘表及黄祖部将','liu-biao'),s(207,219,'wujun','employed','孙氏突袭将领','sun','sun-quan'),free(220,225,'wujun')],
  'taishi-ci':[free(189,193,'beihai'),s(194,195,'danyang','employed','刘繇部将','han','liu-yao'),s(196,199,'wujun','employed','孙策部将','sun','sun-ce'),s(200,205,'nanchang','employed','南方军务','sun','sun-quan'),free(206,211,'nanchang')],
  'huang-gai':[s(190,191,'changsha','employed','孙坚部将','sun','sun-jian'),free(192,193,'shouchun'),s(194,199,'wujun','employed','孙策部将','sun','sun-ce'),s(200,208,'wujun','employed','孙权宿将','sun','sun-quan'),s(209,233,'changsha','employed','武陵及益阳军务联络','sun'),free(234,239,'changsha')],
  'kong-rong':[s(190,195,'beihai','governing','北海相','han'),s(196,207,'xuxian','employed','太中大夫','han'),free(208,213,'xuxian')],
  'tao-qian':[s(188,193,'donghai','governing','徐州刺史·州牧','han'),free(194,199,'donghai')],
  'wang-lang':[s(193,195,'shanyin','governing','会稽太守','han'),free(196,199,'wujun'),s(200,219,'xuxian','employed','汉魏文臣','cao'),s(220,228,'henan','employed','魏廷文臣','cao'),free(229,233,'henan')],
  'shi-xie':[s(187,209,'guangxin','employed','交趾太守·苍梧籍贯联络','han'),s(210,226,'guangxin','employed','交趾太守·孙氏通使','sun'),free(227,231,'guangxin')],
  'liu-yao':[free(190,192,'guangling'),s(193,195,'danyang','governing','扬州刺史·州牧','han'),s(196,196,'nanchang','employed','豫章州务联络','han'),free(197,202,'nanchang')],
  'huang-zu':[s(191,207,'jiangling','employed','江夏太守·区域联络','liu-biao','liu-biao'),free(208,213,'jiangling')],
  'gongsun-du':[s(189,203,'ji','employed','辽东太守·北方联络','han'),free(204,209,'ji')],
  'han-fu':[s(189,190,'ye','governing','冀州牧','han'),free(191,196,'chenliu')],
  'zhang-yang':[s(188,189,'henan','employed','并州军吏·京都联络','han'),s(190,197,'henan','employed','河内太守·洛阳输粮联络','han'),free(198,203,'henan')],
  'hua-xin':[s(189,189,'henan','employed','汉廷郎中','han'),free(190,195,'nanyang'),s(196,199,'nanchang','governing','豫章太守','han'),s(200,201,'wujun','employed','孙氏宾客','sun'),s(202,219,'xuxian','employed','汉魏文臣','cao'),s(220,231,'henan','employed','魏廷重臣','cao'),free(232,236,'henan')],
  'zhao-yu':[s(190,192,'donghai','employed','陶谦别驾','han','tao-qian'),s(193,193,'guangling','governing','广陵太守','han'),free(194,199,'guangling')],
  'liu-chong':[s(184,196,'chenliu','employed','陈王·陈国区域联络','han'),free(197,202,'chenliu')],
};

/** Narrow source-supported candidate windows, never extrapolated to the person's death. */
export const V11_GOVERNOR_EVIDENCE = [
  {cityId:'beihai',personId:'kong-rong',from:190,to:195,title:'北海相',source:'《后汉书》卷70',basis:'任北海相、黄巾围城与建安元年为袁谭所攻；窗口采用保守完整年。'},
  {cityId:'shanyin',personId:'wang-lang',from:193,to:195,title:'会稽太守',source:'《三国志》卷13及卷46',basis:'奉章后任会稽、居郡四年，孙策渡江时败；取193—195完整年，不延至228卒。'},
  {cityId:'nanchang',personId:'hua-xin',from:198,to:199,title:'豫章太守',source:'《三国志》卷13及卷46',basis:'任豫章太守，孙策定豫章后待以上宾；仅选孙策卒前的保守窗口，不宣称始于198。'},
  {cityId:'guangling',personId:'zhao-yu',from:193,to:193,title:'广陵太守',source:'《三国志》卷13、卷49',basis:'王朗同获任命；曹操攻陶谦后被笮融所杀，只取193候选年，不从卒年反推上任。'},
] as const;
export const V11_GOVERNORS: readonly GarrisonCommander[] = V11_GOVERNOR_EVIDENCE.map(item=>({cityId:item.cityId,employerId:item.personId,from:{year:item.from,month:1},to:{year:item.to,month:12}}));
