import { Component, OnInit } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { WorkflowService } from '../../services/workflows/workflows.service';

// import { NgIf } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-workflow-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    MatButtonModule,
    MatSidenavModule,
    MatInputModule,
    MatOption,
    MatFormFieldModule,
    MatSelectModule,
    RouterModule,
    HttpClientModule,
  ],
  templateUrl: './workflow-form.component.html',
  styleUrls: ['./workflow-form.component.css']
})
export class WorkflowFormComponent implements OnInit {
  // showSideNav = false;
  workflowRequestForm!: FormGroup;
  nerscForm!: FormGroup;
  jlabForm!: FormGroup;
  constructor(
    private router: Router,
    private authService: AuthService,
    private WorkflowService: WorkflowService,
    private changeDetectorRef: ChangeDetectorRef,
    ){ }

  ngOnInit(): void {
    this.workflowRequestForm = new FormGroup({
      site: new FormControl('', Validators.required)
    });
    this.nerscForm = new FormGroup({
      jobName: new FormControl('', Validators.required),
      wallTime: new FormControl('', Validators.required)
    });

    this.jlabForm = new FormGroup({
      jobName: new FormControl('', Validators.required),
      cpu: new FormControl('', Validators.required),
      memory: new FormControl('', Validators.required),
      time: new FormControl('', Validators.required),
      nodeType: new FormControl('', Validators.required),
      app: new FormControl('', Validators.required),
      jobType: new FormControl('', Validators.required)
    });
  }
  onSubmit(): void {
    // Ensure the main form that includes the site selection is valid.
    if (this.workflowRequestForm.valid) {
      // Initialize a variable to hold the combined form data including the site.
      let formData: any = {
        site: this.workflowRequestForm.value.site
      };
  
      
      if (this.workflowRequestForm.value.site === 'NERSC' && this.nerscForm.valid) {
        formData = { ...formData, ...this.nerscForm.value };
      } else if (this.workflowRequestForm.value.site === 'JLAB' && this.jlabForm.valid) {
        formData = { ...formData, ...this.jlabForm.value };
      } else {
        console.error('The selected site form is not valid');
        return; 
      }
  
      this.WorkflowService.submitWorkflow(formData).subscribe({
        next: (response) => {
          console.log('Form submission successful', response);
          this.workflowRequestForm.reset(); // reset the main form
          this.nerscForm.reset(); // Reset the NERSC form
          this.jlabForm.reset(); // Reset the JLAB form
          this.changeDetectorRef.detectChanges();
        },
        error: (error) => {
          console.error('There was an error!', error);
        }
      });
    } else {
      console.log('Main form is not valid, ensure the site is selected.');
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
