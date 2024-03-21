import { TestBed } from '@angular/core/testing';

import { WorkflowService } from './workflows.service';

describe('WorkflowsService', () => {
  let service: WorkflowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkflowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
