import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './app/login/login.component';
import { AddjobComponent } from './app/addjob/addjob.component';
import { DashboardComponent } from './app/dashboard/dashboard.component';
import { JoblistComponent } from './app/joblist/joblist.component';

const routes: Routes = [
  { path: '', component: DashboardComponent},
  { path: 'addjob', component: AddjobComponent },
  
  { path: 'joblist', component: JoblistComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
