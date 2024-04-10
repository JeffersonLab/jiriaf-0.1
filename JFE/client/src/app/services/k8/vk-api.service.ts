import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class K8MetricsService {
  private baseUrl = 'http://localhost:3000/api/k8'; 

  constructor(private http: HttpClient) { }


  getNodeMetrics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/node-metrics`).pipe(
      catchError(error => {
        console.error('Error fetching node metrics', error);
        return throwError(error); 
      })
    );
  }
  getPodMetrics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/pod-metrics`).pipe(
      catchError(error => {
        console.error('Error fetching pod metrics', error);
        return throwError(error); 
      })
    );
  }
  deployPod(podData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/deploy-pod`, podData).pipe(
      catchError(error => {
        console.error('Error deploying pod', error);
        return throwError(error);
      })
    );
  }
  deletePod(podName: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/pods/${podName}`).pipe(
      catchError(error => {
        console.error(`Error deleting pod ${podName}`, error);
        return throwError(error);
      })
    );
  }

}
