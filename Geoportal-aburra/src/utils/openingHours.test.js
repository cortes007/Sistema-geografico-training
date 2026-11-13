import { describe, expect, it } from 'vitest';
import { evaluateOpeningHours, isOpenNow } from './openingHours';

describe('openingHours OSM parser & public calisthenics 24/7 rule', () => {
  it('treats 24/7 as always open', () => {
    const wednesdayNight = new Date(2026, 10, 11, 23, 30);
    expect(evaluateOpeningHours('24/7', wednesdayNight)).toBe('open');
    expect(isOpenNow('24/7', { now: wednesdayNight })).toBe(true);
  });

  it('evaluates weekday and weekend hour ranges accurately', () => {
    const fridayMorning = new Date(2026, 10, 13, 8, 30); // Friday 08:30
    const fridayLate = new Date(2026, 10, 13, 22, 15); // Friday 22:15
    const sundayMorning = new Date(2026, 10, 15, 9, 0); // Sunday 09:00

    const schedule = 'Mo-Fr 06:00-22:00; Sa 07:00-18:00; Su off';

    expect(evaluateOpeningHours(schedule, fridayMorning)).toBe('open');
    expect(evaluateOpeningHours(schedule, fridayLate)).toBe('closed');
    expect(evaluateOpeningHours(schedule, sundayMorning)).toBe('closed');
  });

  it('supports wrap-around day ranges (Fr-Mo) and comma-separated days', () => {
    const sundayAfternoon = new Date(2026, 10, 15, 14, 0); // Sunday
    const tuesdayAfternoon = new Date(2026, 10, 17, 14, 0); // Tuesday

    expect(evaluateOpeningHours('Fr-Mo 08:00-20:00', sundayAfternoon)).toBe('open');
    expect(evaluateOpeningHours('Fr-Mo 08:00-20:00', tuesdayAfternoon)).toBe('closed');
    expect(evaluateOpeningHours('Mo,We,Fr 06:00-12:00', new Date(2026, 10, 11, 9, 0))).toBe('open');
  });

  it('treats outdoor calisthenics parks without opening_hours as open 24/7', () => {
    const midnight = new Date(2026, 10, 13, 1, 0);

    expect(isOpenNow('', { equipmentType: 'gimnasio al aire libre', now: midnight })).toBe(true);
    expect(isOpenNow(null, { equipmentType: 'gimnasio al aire libre', now: midnight })).toBe(true);
  });

  it('respects explicit opening_hours even on outdoor parks when provided', () => {
    const lateNight = new Date(2026, 10, 13, 23, 0);

    expect(
      isOpenNow('Mo-Su 05:00-21:00', { equipmentType: 'gimnasio al aire libre', now: lateNight })
    ).toBe(false);
  });

  it('returns false (unknown/excluded) for indoor gyms or sports centres without opening_hours', () => {
    const noon = new Date(2026, 10, 13, 12, 0);

    expect(evaluateOpeningHours('', noon)).toBe('unknown');
    expect(evaluateOpeningHours('consultar por whatsapp', noon)).toBe('unknown');
    expect(isOpenNow('', { equipmentType: 'gimnasio', now: noon })).toBe(false);
    expect(isOpenNow('', { equipmentType: 'centro deportivo', now: noon })).toBe(false);
  });
});
