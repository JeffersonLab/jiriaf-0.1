import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AddjobComponent } from './app/addjob/addjob.component';
import { LoginComponent } from './app/login/login.component';
import { JoblistComponent } from './app/joblist/joblist.component';
import { DashboardComponent } from './app/dashboard/dashboard.component';
import {HttpClientModule} from '@angular/common/http'
import { DataService } from './app/service/data.service';
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
    AppRoutingModule,
    HttpClientModule,
    FormsModule
    
   
  ],
  providers: [DataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
