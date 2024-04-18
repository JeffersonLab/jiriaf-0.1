import { Component, ViewChild, OnInit, Inject, PLATFORM_ID, viewChild  } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';

import { Router } from '@angular/router';
// Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
//Metrics support
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
// Services
import { AuthService } from '../../services/auth/auth.service';
import { K8MetricsService } from '../../services/k8/vk-api.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    HttpClientModule,
      
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {

  public currentUserEmail: string = '';
  nodeColumns: string[] = ['node', 'cpu', 'memory' ]; 
  podColumns: string[] = ['pod', 'cpu', 'memory'];
  k8_apiColumns: string[] = [
    'node', 'totalCpu', 'allocatedCpu', 'availableCpu', 'totalMemory', 
    'allocatedMemory', 'availableMemory', 'walltime', 'nodetype', 
    'site', 'alivetime', 'status'
  ];
  nodeDataSource = []; 
  podDataSource = [];
  k8_apiDataSource = [];
   //TODO: fix pagination
  @ViewChild('nodesPaginator') nodesPaginator!: MatPaginator;
  @ViewChild('podsPaginator') podsPaginator!: MatPaginator;
  @ViewChild('k8_apiPaginator') k8_apiPaginator!: MatPaginator;

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(HttpClient) private http: HttpClient,
    private k8_Api: K8MetricsService,
    @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    setCurrentUser(): void {
    this.authService.getCurrentUser().then((user) => {
      console.log('Current user:', user.email);
      this.currentUserEmail = user.email;
      console.log('Current user:', this.currentUserEmail);

    });
  }

  ngOnInit(): void {
    this.pollNodeMetrics();
    this.pollPodMetrics();
  }

  pollNodeMetrics(): void {
    interval(5000) // Polling every 5000 milliseconds (5 seconds)
      .pipe(
        switchMap(() => this.k8_Api.getNodeMetrics())
      )
      .subscribe(data => {
        this.k8_apiDataSource = data.map((node: any) => ({
         
          node: node.node,
          totalCpu: parseFloat(node.totalCpu).toFixed(2),
          allocatedCpu: parseFloat(node.allocatedCpu).toFixed(2),
          availableCpu: parseFloat(node.availableCpu).toFixed(2),
          totalMemory: parseFloat(node.totalMemory).toFixed(2),
          allocatedMemory: parseFloat(node.allocatedMemory).toFixed(2),
          availableMemory: parseFloat(node.availableMemory).toFixed(2),
          walltime: parseFloat(node.walltime).toFixed(2),
          nodetype: node.nodetype,
          site: node.site,
          alivetime: node.alivetime,
          status: node.status,
        }));
        console.log('Node Metrics Updated:', this.k8_apiDataSource);
      }, error => {
        console.error('Error polling node metrics:', error);
      });
  }  
  pollPodMetrics(): void {
    interval(5000) // Polling every 5000 milliseconds (5 seconds)
      .pipe(
        switchMap(() => this.k8_Api.getPodMetrics())
      )
      .subscribe(data => {
        this.podDataSource = data.map((pod: any) => ({
          pod: pod.pod,
          cpu: parseFloat(pod.cpu).toFixed(2),
          memory: parseFloat(pod.memory).toFixed(2),
        }));
        console.log('Pod Metrics Updated:', this.podDataSource);
      }, error => {
        console.error('Error polling pod metrics:', error);
      });
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
