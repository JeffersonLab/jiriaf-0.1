import { Component } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-register-new-user',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './register-new-user.component.html',
  styleUrl: './register-new-user.component.css'
})
export class RegisterNewUserComponent {
  constructor(
    private authService: AuthService,
  ) {}

  logout() {
    this.authService.logout();
  }

}
