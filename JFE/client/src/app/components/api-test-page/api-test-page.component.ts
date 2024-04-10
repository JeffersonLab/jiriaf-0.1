import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { K8MetricsService } from '../../services/k8/vk-api.service';

@Component({
  selector: 'app-test-buttons',
  templateUrl: './api-test-page.component.html',
  styleUrls: ['./api-test-page.component.css']
})
export class TestButtonsComponent {
  private apiUrl = 'http://localhost:3000/api/k8';
  private k8_Api = new K8MetricsService(this.http);

  constructor(private http: HttpClient) { }

  getNodeMetrics(): void {
    console.log('Requesting Node Metrics...');
    this.k8_Api.getNodeMetrics().subscribe({
      next: (response: any) => console.log('Node Metrics:', response),
      error: (error: ErrorEvent) => console.error('Error fetching node metrics:', error)
    });

  }

  getPodMetrics(): void {
    console.log('Requesting Pod Metrics...');
    this.http.get(`${this.apiUrl}/pod-metrics`).subscribe({
      next: (response) => console.log('Pod Metrics:', response),
      error: (error) => console.error('Error fetching pod metrics:', error)
    });
  }

  deployPod(): void {
    console.log('Deploying Pod...');
    const body = { name: 'examplePod', args: [], cpu: '500m', memory: '128Mi' }; 
    this.http.post(`${this.apiUrl}/deploy-pod`, body).subscribe({
      next: (response) => console.log('Pod Deployment Response:', response),
      error: (error) => console.error('Error deploying pod:', error)
    });
  }

  deployPodWithConfigMaps(): void {
    console.log('Deploying Pod with ConfigMaps...');
    const body = { name: 'examplePodWithConfig', args: [], cpu: '500m', memory: '128Mi' }; 
    this.http.post(`${this.apiUrl}/deploy-pod-with-configmaps`, body).subscribe({
      next: (response) => console.log('Pod with ConfigMaps Deployment Response:', response),
      error: (error) => console.error('Error deploying pod with ConfigMaps:', error)
    });
  }
}
