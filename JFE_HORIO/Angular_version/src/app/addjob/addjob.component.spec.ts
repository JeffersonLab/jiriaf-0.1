import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddjobComponent } from './addjob.component';

describe('AddjobComponent', () => {
  let component: AddjobComponent;
  let fixture: ComponentFixture<AddjobComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddjobComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddjobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
