import { describe, expect, it } from 'vitest';
import { ORIGINS } from './history';
import { LOCAL_OFFICIALS, localOfficeRecords, localCityOfficeRecords, officialStatus } from './localOfficials';

describe('sourced local officials', () => {
  it('uses the visited city province and leaves an unresearched prefecture empty', () => {
    const offices = localCityOfficeRecords({ id: 'xiangyang', name: '襄阳', provinceId: 'jing', prefecture: '南郡', lon: 112.1, lat: 32 }, { year: 184, month: 6 });
    expect(offices[0].records.map(r => r.id)).toEqual(['xu-qiu']);
    expect(offices[1]).toMatchObject({ place: '南郡', title: '南郡太守', records: [] });
  });
  it('provides distinct province and prefecture slots for every starting place', () => {
    for (const origin of ORIGINS) {
      const slots = localOfficeRecords(origin.id, { year: 184, month: 3 });
      expect(slots.map(s => s.level)).toEqual(['province', 'prefecture']);
    }
    expect(localOfficeRecords('henan', { year: 184, month: 3 }).map(s => s.title)).toEqual(['司隶校尉', '河南尹']);
    expect(localOfficeRecords('beihai', { year: 184, month: 3 })[1].title).toBe('北海相');
    expect(localOfficeRecords('donghai', { year: 184, month: 3 })[1].title).toBe('东海相');
  });
  it('keeps unverified places empty rather than importing later famous incumbents', () => {
    const slots = localOfficeRecords('wujun', { year: 184, month: 3 });
    expect(slots.every(s => s.records.length === 0)).toBe(true);
    expect(localOfficeRecords('yingchuan', { year: 184, month: 3 })[0].records.map(r => r.id)).toEqual(['wang-yun']);
  });
  it('does not bring Jia Cong or Qin Jie forward before their documented month', () => {
    expect(localOfficeRecords('nanhai', { year: 184, month: 3 })[0].records).toHaveLength(0);
    expect(localOfficeRecords('nanhai', { year: 184, month: 6 })[0].records.map(r => r.id)).toEqual(['jia-cong']);
    expect(localOfficeRecords('nanyang', { year: 184, month: 3 })[1].records.map(r => r.id)).toEqual(['chu-gong']);
    expect(localOfficeRecords('nanyang', { year: 184, month: 6 })[1].records.map(r => r.id)).toEqual(['qin-jie', 'chu-gong']);
  });
  it('distinguishes death records, earlier records and uncertain months', () => {
    const get = (id: string) => LOCAL_OFFICIALS.find(o => o.id === id)!;
    expect(officialStatus(get('guo-xun'), { year: 184, month: 3 })).toBe('未到记载节点');
    expect(officialStatus(get('guo-xun'), { year: 184, month: 4 })).toBe('本月遇害');
    expect(officialStatus(get('guo-xun'), { year: 184, month: 5 })).toBe('已遇害 · 留存史事');
    expect(officialStatus(get('wang-yun'), { year: 184, month: 3 })).toBe('本年任职有据 · 月份未详');
    expect(officialStatus(get('xu-qiu'), { year: 190, month: 4 })).toBe('往年任职记录');
  });
  it('gives each of the eight approved identities a unique portrait and a direct source', () => {
    expect(LOCAL_OFFICIALS.map(o => o.name)).toEqual(['王允','徐璆','郭勋','贾琮','郭典','赵谦','褚贡','秦颉']);
    expect(new Set(LOCAL_OFFICIALS.map(o => o.portrait)).size).toBe(8);
    for (const official of LOCAL_OFFICIALS) {
      expect(official.source.url).toMatch(/^https:\/\//);
      expect(official.source.title.length).toBeGreaterThan(3);
      expect(official.portrait).toMatch(/^\/assets\/characters\/.+\.png$/);
      expect(official).not.toHaveProperty('attack');
    }
  });
});
