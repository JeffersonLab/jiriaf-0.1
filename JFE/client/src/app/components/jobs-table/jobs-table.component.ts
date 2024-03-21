import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { WorkflowService } from '../../services/workflows/workflows.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-jobs-table',
  standalone: true,
  imports: [     
    MatSidenavModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
   ],
  templateUrl: './jobs-table.component.html',
  styleUrl: './jobs-table.component.css'
})
export class JobsTableComponent implements OnInit {
  displayedColumns: string[] = [
    // 'user',  // TODO: add user column
    'user',
    'name', 
    'cpu', 
    'memory', 
    'time',
    'nodeType',
    'site',
    'app',
    'jobType',
    'status'
  ];
  dataSource!: Observable<any[]>;

  constructor(
    private workflowsService: WorkflowService,
    private router: Router,
    private authService: AuthService
    ) {}

  ngOnInit(): void {
    this.dataSource = this.workflowsService.getJobs();
  }
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