import { Component } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  constructor(
    private authService: AuthService,
  ) {}

    loginWithCILogon() {
      this.authService.initiateCILogonLogin();


    }}