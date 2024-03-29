import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { inject } from '@angular/core';

// Functional guard for role-based access control
export const roleGuard = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const expectedRoles = route.data['expectedRoles'];
  const userRole = await authService.getCurrentUserRole(); // Await the promise to resolve
  console.log('User role:', userRole);
  console.log('Expected role:', expectedRoles);
  if (expectedRoles.includes(userRole)) {
    return true;
  } else if (userRole === 'pending') {
    return router.createUrlTree(['/']); // TODO: add pending splash page
  } else {
    return router.createUrlTree(['/login']); // Redirect unauthorized users
  }
};
