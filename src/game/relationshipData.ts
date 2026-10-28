/** Authored reference relationships, not events asserted to have happened in this campaign. */
export interface ReferenceRelationship {
  a: string; b: string; labelA: string; labelB: string; source: string;
  kind: 'family' | 'story';
}
const family = (a: string, b: string, labelA: string, labelB: string, source: string): ReferenceRelationship =>
  ({ a, b, labelA, labelB, source, kind: 'family' });
const father = (a: string, b: string, source: string) => family(a, b, '儿子', '父亲', source);
const brother = (a: string, b: string, source: string) => family(a, b, '弟弟', '哥哥', source);
export const REFERENCE_RELATIONSHIPS: readonly ReferenceRelationship[] = [
  father('cao-cao', 'cao-pi', '人物资料 · 《三国志·文帝纪》'),
  father('cao-pi', 'cao-rui', '人物资料 · 《三国志·明帝纪》'),
  family('zhen-ji', 'cao-rui', '儿子', '母亲', '人物资料 · 《三国志·后妃传》'),
  family('cao-pi', 'zhen-ji', '妻子', '丈夫', '人物资料 · 《三国志·后妃传》；采用人物生平关系，不表示本年已经成婚'),
  father('liu-bei', 'liu-shan', '人物资料 · 《三国志·后主传》'),
  father('liu-shan', 'liu-chen', '人物资料 · 《三国志·后主传》'),
  family('liu-bei', 'mi-fu-ren', '妻子', '丈夫', '人物资料 · 《三国志·糜竺传》'),
  family('liu-bei', 'sun-shangxiang', '妻子', '丈夫', '人物资料 · 《三国志·先主传》孙夫人；孙尚香为故事姓名'),
  father('sun-jian', 'sun-ce', '人物资料 · 《三国志·孙破虏讨逆传》'),
  father('sun-jian', 'sun-quan', '人物资料 · 《三国志·吴主传》'),
  family('sun-jian', 'sun-shangxiang', '女儿', '父亲', '人物资料 · 《三国志·先主传》孙夫人相关记载；采用故事姓名'),
  brother('sun-ce', 'sun-quan', '人物资料 · 《三国志·吴主传》'),
  family('sun-quan', 'sun-shangxiang', '妹妹', '哥哥', '人物资料 · 《三国志·先主传》孙夫人相关记载；采用故事姓名'),
  father('sun-quan', 'sun-liang', '人物资料 · 《三国志·三嗣主传》'),
  father('sun-quan', 'sun-xiu', '人物资料 · 《三国志·三嗣主传》'),
  brother('sun-xiu', 'sun-liang', '人物资料 · 《三国志·三嗣主传》'),
  father('sima-yi', 'sima-shi', '人物资料 · 《晋书·景帝纪》'),
  father('sima-yi', 'sima-zhao', '人物资料 · 《晋书·文帝纪》'),
  brother('sima-shi', 'sima-zhao', '人物资料 · 《晋书·景帝纪》《文帝纪》'),
  father('sima-zhao', 'sima-yan', '人物资料 · 《晋书·武帝纪》'),
  father('zhong-yao', 'zhong-hui', '人物资料 · 《三国志·钟会传》'),
  father('ma-teng', 'ma-chao', '人物资料 · 《三国志·马超传》'),
  father('lu-xun', 'lu-kang', '人物资料 · 《三国志·陆抗传》'),
  family('zhang-fei', 'zhang-xingcai', '女儿', '父亲', '人物资料 · 《三国志·二主妃子传》张皇后；张星彩为故事姓名'),
  family('liu-shan', 'zhang-xingcai', '妻子', '丈夫', '人物资料 · 《三国志·二主妃子传》张皇后；张星彩为故事姓名'),
  family('xun-yu', 'xun-you', '侄子', '叔父', '人物资料 · 《三国志·荀攸传》；辈分与年龄分别处理'),
  brother('yuan-shao', 'yuan-shu', '人物资料 · 袁氏家族关系；不据同姓推导其他关系'),
];

export const STORY_RELATIONSHIPS: readonly ReferenceRelationship[] = [
  { a: 'liu-bei', b: 'guan-yu', labelA: '结义伙伴', labelB: '结义伙伴', kind: 'story', source: '故事设定 · 《三国演义》桃园结义；不作为确证史实' },
  { a: 'liu-bei', b: 'zhang-fei', labelA: '结义伙伴', labelB: '结义伙伴', kind: 'story', source: '故事设定 · 《三国演义》桃园结义；不作为确证史实' },
  { a: 'guan-yu', b: 'zhang-fei', labelA: '结义伙伴', labelB: '结义伙伴', kind: 'story', source: '故事设定 · 《三国演义》桃园结义；不作为确证史实' },
];
