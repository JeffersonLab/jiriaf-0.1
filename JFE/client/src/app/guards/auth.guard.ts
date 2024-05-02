import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth/auth.service'; 

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return new Promise((resolve, reject) => {
      this.authService.getCurrentUser().then(user => {
        const roles = route.data['roles'] as Array<string>;
        if (user && roles.includes(user.role)) {
          console.log('User is authenticated and has role:', user.role);
          resolve(true); 
        } else {
          // User is not authenticated, redirect to login page
          console.log('User is not authenticated or is missing required role. Redirecting to login.');
          console.log('User:', user);
          console.log('Role:', user.role);
          this.router.navigate(['/login']);
          resolve(false);
        }
      }).catch((error:any) => {
        // In case of an error (e.g., unable to reach the server), redirect to login
        console.log("error:", error);
        this.router.navigate(['/login']);
        resolve(false); 
      });
    });
  }
}
