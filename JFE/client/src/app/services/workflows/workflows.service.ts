import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private apiUrl = 'http://localhost:3000/api/workflows'; 
  private jobsUrl = 'http://localhost:3000/api/jobRequest';

  constructor(private http: HttpClient) { }

  submitWorkflow(workflowData: any): Observable<any> {
    return this.http.post(this.apiUrl, workflowData, { withCredentials: true });
  }
  getJobs(): Observable<any[]> {
    return this.http.get<any[]>(this.jobsUrl);
  }
}
