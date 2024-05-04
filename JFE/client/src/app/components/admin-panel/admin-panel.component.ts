import { Component, OnInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';  // Ensure the path to AuthService is correct
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [MatTableModule, MatPaginatorModule, MatButtonModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent implements OnInit {
  displayedColumns: string[] = ['email', 'role', 'actions'];
  dataSource: MatTableDataSource<User>;
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  constructor(private authService: AuthService) {
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
}
interface User {
  email: string;
  role: string;
  _id?: string; 
}
