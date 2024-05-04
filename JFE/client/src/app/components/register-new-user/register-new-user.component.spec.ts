import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterNewUserComponent } from './register-new-user.component';

describe('RegisterNewUserComponent', () => {
  let component: RegisterNewUserComponent;
  let fixture: ComponentFixture<RegisterNewUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterNewUserComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RegisterNewUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
