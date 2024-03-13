import { Component, ViewChild, OnInit, Inject, PLATFORM_ID, viewChild  } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

import { AuthService } from '../../services/auth/auth.service';


// TODO: move logic for ws and import { Table3Service } from '../../services/table-3.service';
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
  private webSocket_8765!: WebSocket;
  private webSocket_8888!: WebSocket;
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
    if (isPlatformBrowser(this.platformId)) {
      this.connectWebSocket();
      this.setCurrentUser();

    }
  }
  connectWebSocket(): void {
    this.webSocket_8765 = new WebSocket('ws://localhost:8765');
    this.webSocket_8888 = new WebSocket('ws://localhost:8888');
      this.webSocket_8888.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log(data);
          this.k8_apiDataSource = data.map((item: any) => ({
            node: item[0],
            totalCpu: item[1],
            allocatedCpu: item[2],
            availableCpu: item[3],
            totalMemory: item[4],
            allocatedMemory: item[5],
            availableMemory: item[6],
            walltime: item[7],
            nodetype: item[8],
            site: item[9],
            alivetime: item[10],
            status: item[11],
          }));
      }
      this.webSocket_8888.onerror = (error) => {
          console.error('WebSocket Error: ', error);
        }
        this.webSocket_8765.onerror = (error) => {
            console.error('WebSocket Error: ', error);
          };
        
    this.webSocket_8765.onmessage = (event) => {
      console.log('Data received: ', event.data);
      const data = JSON.parse(event.data);
      this.nodeDataSource = data.node_metrics.map((node: any) => ({
        node: node.node,
        cpu: node.cpu,
        memory: node.memory,
        // age: node[3],
      }));
      
      this.podDataSource = data.pod_metrics.map((pod: any) => ({
        pod: pod.pod, 
        cpu: pod.cpu ,
        memory: pod.memory,
        // age: pod[3],
      }));
    }
    this.webSocket_8765.onmessage = (event) => {
      console.log('Data received: ', event.data);
      const data = JSON.parse(event.data);
      this.nodeDataSource = data.node_metrics.map((node: any) => ({
        node: node.node,
        cpu: node.cpu,
        memory: node.memory,
        // age: node[3],
      }));
      
      this.podDataSource = data.pod_metrics.map((pod: any) => ({
        pod: pod.pod, 
        cpu: pod.cpu ,
        memory: pod.memory,
        // age: pod[3],
      }));
    };
    this.webSocket_8765.onopen = () => {
      // Send a message to request data once the connection is open
      this.webSocket_8765.send('get_node_metrics'); // or 'get_pod_metrics'
    };
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
