import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiTestPageComponent } from './api-test-page.component';

describe('ApiTestPageComponent', () => {
  let component: ApiTestPageComponent;
  let fixture: ComponentFixture<ApiTestPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiTestPageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApiTestPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
