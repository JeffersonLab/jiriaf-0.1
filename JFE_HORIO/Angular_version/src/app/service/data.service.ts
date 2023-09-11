import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  sendData(formData: any): Observable<any> {
    const apiUrl = 'http://localhost:8081/forminfo'; 
    
    console.log(formData, "Data Service Form Data")
    // Send POST request with the array of attributes
    return this.http.post<any>(apiUrl, formData);
  }

  getData(getData: any): Observable<any> {
    const apiUrl = 'http://localhost:8081/forminfo'; 

    // Send POST request with the array of attributes
    return this.http.post<any>(apiUrl, getData);
  }
}
