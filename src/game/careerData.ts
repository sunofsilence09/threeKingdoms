import { GENERATION_CAREERS } from './generationData';

/** Authored game appointments, not exact historical terms. Inclusive year/month bounds. */
export interface CareerStage {
  from: { year: number; month?: number };
  to: { year: number; month?: number };
  cityId: string;
  kind: 'employed' | 'governing' | 'free';
  title: string;
  office: string;
  employerId?: string;
}

const stage = (from: number, to: number, cityId: string, kind: CareerStage['kind'], title: string, office: string, employerId?: string): CareerStage =>
  ({ from: { year: from, month: 1 }, to: { year: to, month: 12 }, cityId, kind, title, office, ...(employerId ? { employerId } : {}) });

/** This plain data module deliberately has no runtime imports or mutable saved roster. */
export const CITY_CAREERS: Readonly<Record<string, readonly CareerStage[]>> = {
  ...GENERATION_CAREERS,
  'yuan-shu': [
    stage(189, 189, 'henan', 'free', '在朝游历', '洛阳'),
    stage(190, 192, 'nanyang', 'governing', '势力主事', '袁术府署'),
    stage(193, 198, 'shouchun', 'governing', '势力主事', '袁术府署'),
  ],
  'chen-gong': [
    stage(192, 193, 'dongjun', 'employed', '谋佐', '曹操军府', 'cao-cao'),
    stage(194, 195, 'dongjun', 'employed', '谋佐', '吕布军府', 'lu-bu'),
    stage(196, 198, 'xiapi', 'employed', '谋佐', '吕布军府', 'lu-bu'),
  ],
  'zhang-miao': [stage(190, 194, 'chenliu', 'governing', '陈留太守·主事人物', '陈留郡府')],
  'gao-shun': [stage(196, 198, 'xiapi', 'employed', '步军统领', '吕布军府', 'lu-bu')],
  'zhou-tai': [
    stage(196, 199, 'wujun', 'employed', '护卫', '孙策军府', 'sun-ce'),
    stage(200, 207, 'danyang', 'employed', '护卫', '孙权军府', 'sun-quan'),
    stage(208, 219, 'jiangling', 'employed', '护卫', '孙权军府', 'sun-quan'),
    stage(220, 221, 'danyang', 'employed', '护卫', '孙权军府', 'sun-quan'),
  ],
  'han-dang': [
    stage(184, 186, 'nanyang', 'employed', '弓马武将', '孙坚军府', 'sun-jian'),
    stage(187, 190, 'changsha', 'employed', '弓马武将', '孙坚军府', 'sun-jian'),
    stage(195, 199, 'wujun', 'employed', '弓马武将', '孙策军府', 'sun-ce'),
    stage(200, 225, 'wujun', 'employed', '弓马武将', '孙权军府', 'sun-quan'),
  ],
  'xiahou-dun': [
    stage(189, 191, 'chenliu', 'employed', '军府将领', '曹操军府', 'cao-cao'),
    stage(192, 194, 'dongjun', 'employed', '军府将领', '曹操军府', 'cao-cao'),
    stage(195, 219, 'henan', 'employed', '军府将领', '曹操军府', 'cao-cao'),
  ],
  'xiahou-yuan': [
    stage(189, 195, 'chenliu', 'employed', '弓马将领', '曹操军府', 'cao-cao'),
    stage(196, 210, 'xuxian', 'employed', '弓马将领', '曹操军府', 'cao-cao'),
    stage(211, 214, 'changan', 'employed', '弓马将领', '曹操军府', 'cao-cao'),
    stage(215, 218, 'nanzheng', 'employed', '弓马将领', '曹操军府', 'cao-cao'),
  ],
  'cao-ren': [
    stage(190, 195, 'chenliu', 'employed', '守阵将领', '曹操军府', 'cao-cao'),
    stage(196, 207, 'xuxian', 'employed', '守阵将领', '曹操军府', 'cao-cao'),
    stage(208, 209, 'jiangling', 'employed', '守阵将领', '曹操军府', 'cao-cao'),
    stage(210, 219, 'xiangyang', 'employed', '荆北联络将领', '曹操军府', 'cao-cao'),
  ],
  'cao-xiu': [
    stage(200, 217, 'xuxian', 'employed', '骑军将领', '曹操军府', 'cao-cao'),
    stage(218, 219, 'changan', 'employed', '骑军将领', '曹操军府', 'cao-cao'),
    stage(220, 227, 'shouchun', 'employed', '军府将领', '曹魏军府'),
  ],
  'liu-biao': [stage(190, 207, 'xiangyang', 'governing', '荆州主事', '刘表府署')],
  'liu-zhang': [stage(194, 213, 'shujun', 'governing', '益州主事', '刘璋府署')],
  'zhang-lu': [stage(194, 214, 'nanzheng', 'governing', '汉中主事', '张鲁府署')],
  'ma-teng': [
    stage(188, 191, 'didao', 'governing', '凉州军府主事', '凉州军府联络处'),
    stage(192, 207, 'changan', 'governing', '关中军府主事', '关中军府联络处'),
    stage(208, 211, 'xuxian', 'free', '入朝宿卫', '许都'),
  ],
  'gongsun-zan': [
    stage(184, 187, 'zhuo', 'employed', '地方军吏', '涿郡军府'),
    stage(188, 192, 'zhuo', 'governing', '军府主事', '公孙瓒外军联络处'),
    stage(193, 194, 'ji', 'governing', '军府主事', '公孙瓒军府'),
  ],
  'yuan-shao': [
    { ...stage(188, 189, 'henan', 'free', '在朝人物', '洛阳'), to: { year: 189, month: 8 } },
    stage(191, 201, 'ye', 'governing', '冀州主事', '袁绍府署'),
  ],
  'liu-yu': [stage(188, 192, 'ji', 'governing', '幽州主事', '刘虞府署')],
  'zhang-yan': [
    stage(184, 204, 'julu', 'governing', '黑山部众首领', '黑山部众联络处'),
    stage(205, 210, 'ye', 'employed', '军府将领', '曹操军府', 'cao-cao'),
  ],
};
