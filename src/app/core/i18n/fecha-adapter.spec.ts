import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { FechaAdapter } from './fecha-adapter';

describe('FechaAdapter', () => {
  const adapter = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-ES' }, { provide: DateAdapter, useClass: FechaAdapter }] });
    return TestBed.inject(DateAdapter) as FechaAdapter;
  };

  it('lee lo escrito como día/mes/año', () => {
    const a = adapter();
    expect(a.parse('03/04/2026', null)).toEqual(new Date(2026, 3, 3));
    expect(a.parse('15-3-23', null)).toEqual(new Date(2023, 2, 15));
    expect(a.parse('1.12.2026', null)).toEqual(new Date(2026, 11, 1));
  });

  it('rechaza fechas imposibles en vez de moverlas de mes', () => {
    const a = adapter();
    expect(a.isValid(a.parse('31/02/2026', null)!)).toBe(false);
    expect(a.isValid(a.parse('13/13/2026', null)!)).toBe(false);
    expect(a.parse('', null)).toBeNull();
  });
});
