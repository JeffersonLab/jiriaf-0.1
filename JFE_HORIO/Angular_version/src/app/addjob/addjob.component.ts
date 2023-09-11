import { Component, ViewChild } from '@angular/core';
import { DataService } from '../service/data.service';
import { tap, catchError } from 'rxjs/operators'; // Import pipeable operators
import { throwError } from 'rxjs';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-addjob',
  templateUrl: './addjob.component.html',
  styleUrls: ['./addjob.component.css']
})
export class AddjobComponent {
  formData = {
    workflow: '',
    accountName: '',
    partitionName: '',
    jobName: '',
    antecedent: '',
    condition: '',
    constraint: '',
    cores: 0,
    diskAmount: '',
    diskUnit: 'mega',
    exclusive: '',
    input: '',
    output: '',
    phase: 0,
    ramAmount: '',
    ramUnit: 'bytes',
    shell: '',
    site: '',
    stdOut: '',
    stderr: '',
    tag: '',
    timeAmount: '',
    timeUnit: 'seconds'
  };
  @ViewChild('myForm') myForm: NgForm;
  constructor(private dataService: DataService) { }

  onSubmit() {

   
   
    console.log('Form Data INFo:', this.formData);

    
    this.dataService.sendData(this.formData).pipe(
      tap(response => {
        
        console.log('Response:', response);
        
      }),
      catchError(error => {
        
        console.error('Error:', error);
        return throwError(error);
      })
    ).subscribe(); 

    this.myForm.resetForm();
  }
}
