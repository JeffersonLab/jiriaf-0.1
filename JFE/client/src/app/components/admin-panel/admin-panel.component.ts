import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ViewChild } from '@angular/core';
// Services
import { AuthService } from '../../services/auth/auth.service';  // Ensure the path to AuthService is correct

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatSidenavModule
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  displayedColumns: string[] = ['email', 'role', 'actions'];
  dataSource: MatTableDataSource<User>;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) 
  {
    this.dataSource = new MatTableDataSource<User>([]);
  }

  ngOnInit(): void {
    this.authService.getAllUsers().then((users: User[]) => {
      this.dataSource.data = users;
      this.dataSource.paginator = this.paginator;
    });
  }

  updateRole(user: User, newRole: string): void {
    this.authService.updateRole(user.email, newRole).then(() => {
      //refresh the user list
      this.authService.getAllUsers().then((users: User[]) => {
        this.dataSource.data = users;
        this.dataSource.paginator = this.paginator;
      });    
      
    })

      
  }
  deleteUser(user: User): void {
  this.authService.deleteUser(user.email).then(() => {
    this.authService.getAllUsers().then((users: User[]) => {
      this.dataSource.data = users;
      this.dataSource.paginator = this.paginator;
    }); 
  })};
  navToDashBoard(): void {
    this.router.navigate(['/dashboard'])
  }
  navToJobTable(): void {
    this.router.navigate(['/job-table'])
  }
  navToWorkflow() {
    this.router.navigate(['/workflow-form']);
  }
  logout() {
    this.authService.logout();
  }
}
interface User {
  email: string;
  role: string;
  _id?: string; 
}
