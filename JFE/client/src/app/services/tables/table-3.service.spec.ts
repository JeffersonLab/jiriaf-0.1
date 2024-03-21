import { TestBed } from '@angular/core/testing';

import { Table3Service } from './table-3.service';

describe('Table3Service', () => {
  let service: Table3Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Table3Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
