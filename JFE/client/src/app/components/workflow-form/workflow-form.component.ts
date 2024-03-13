import { Component, OnInit } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { WorkflowService } from '../../services/workflows/workflows.service';

// import { NgIf } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-workflow-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    MatButtonModule,
    MatSidenavModule,
    MatInputModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './workflow-form.component.html',
  styleUrls: ['./workflow-form.component.css']
})
export class WorkflowFormComponent implements OnInit {
  // showSideNav = false;
  workflowRequestForm!: FormGroup;
  constructor(
    private router: Router,
    private authService: AuthService,
    private WorkflowService: WorkflowService,
    private changeDetectorRef: ChangeDetectorRef,
    ){ }

  ngOnInit(): void {
    this.workflowRequestForm = new FormGroup({
      jobName: new FormControl('', Validators.required),
      cpu: new FormControl('', Validators.required),
      memory: new FormControl('', Validators.required),
      time: new FormControl('', Validators.required),
      nodeType: new FormControl('', Validators.required),
      site: new FormControl('', Validators.required),
      app: new FormControl('', Validators.required),
      jobType: new FormControl('', Validators.required),
    });
  }
  onSubmit(): void {
    // console.log(this.authService.getCurrentUser());
    if (this.workflowRequestForm.valid) {
      this.WorkflowService.submitWorkflow(this.workflowRequestForm.value).subscribe({
        next: (response) => {
          console.log('Form submission successful', response);
          this.changeDetectorRef.detectChanges();
          this.workflowRequestForm.reset();
        },
        error: (error) => {
          console.error('There was an error!', error);
        }
      });
    } else {
      console.log('Form is not valid');
    }
  }  

  navToDashBoard(): void {
    this.router.navigate(['/dashboard'])
  }
  navToJobTable(): void {
    this.router.navigate(['/job-table'])
  }
  navToWorkflow() {
    this.router.navigate(['/workflow-form']);
  }
  logout() {
    this.authService.logout();
  }
}
