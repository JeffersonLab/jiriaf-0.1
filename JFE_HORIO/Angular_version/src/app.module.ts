import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AddjobComponent } from './app/addjob/addjob.component';
import { LoginComponent } from './app/login/login.component';
import { JoblistComponent } from './app/joblist/joblist.component';
import { DashboardComponent } from './app/dashboard/dashboard.component';


@NgModule({
  declarations: [
    AppComponent,
    AddjobComponent,
    LoginComponent,
    JoblistComponent,
    DashboardComponent,
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
