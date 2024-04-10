import { TestBed } from '@angular/core/testing';

import { VkApiService } from './vk-api.service';

describe('VkApiService', () => {
  let service: VkApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VkApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
