import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom  } from 'rxjs';
@Injectable({
  providedIn: 'root',
})

export class AuthService {

  constructor(private http: HttpClient) {
  }
  // TODO: Move user service to its own service
  getAllUsers(): Promise<any> {
    const url = 'http://localhost:3000/api/users';
    return firstValueFrom(this.http.get<any>(url, { withCredentials: true }))
      .then(response => response || null);
  }
    // TODO: Move user service to its own service

  getCurrentUser(): Promise<any> {
    const url = 'http://localhost:3000/api/user/profile';
    return firstValueFrom(this.http.get<any>(url, { withCredentials: true }))    
      .then(response => response || null);
  }
  updateRole(email: string, role: string): Promise<any> {
    const url = 'http://localhost:3000/api/user/role';
    const body = { email, role };
    return firstValueFrom(this.http.post<any>(url, body, { withCredentials: true }))
      .then(response => response || null);
  }
  deleteUser(email: string): Promise<any> {
    const url = 'http://localhost:3000/api/user/delete';
    const body = { email };
    return firstValueFrom(this.http.post<any>(url, body, { withCredentials: true }))
      .then(response => response || null);
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

}
