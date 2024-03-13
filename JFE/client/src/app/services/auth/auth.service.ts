import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class AuthService {


  constructor(private http: HttpClient) {
  }


  initiateCILogonLogin(): void {
    // TODO: Prod: update endpoint
    const loginUrl = 'http://localhost:3000/auth/cilogon';
    window.location.href = loginUrl;
  }


  // Function to log out the user
  logout(): void {
    console.log('Logging out');
    const url = 'http://localhost:3000/auth/logout'; // Endpoint to log out the user
    this.http.post(url, {}, { withCredentials: true })
      .subscribe( {
        // Handle successful logout here, redirect to login page
        next: () => {
          sessionStorage.clear();
          console.log('Logged out successfully');
          window.location.href = '/login';
        },
        error: (err) => {
          console.error('Logout failed:', err);
        }
      });
  }
  getCurrentUser(): Promise<any> {
    const url = 'http://localhost:3000/api/user/email';
    return this.http.get<any>(url, { withCredentials: true })
      .toPromise()
      .then(response => response || null);
  }
}
