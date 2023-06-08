import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { FormsModule } from '@angular/forms';

import { jobtable } from './joblist/app.jobtable';
//import { joblist } from './joblist/app.joblist';

import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table'  

@NgModule({
  declarations: [
    jobtable,
    //joblist
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatPaginatorModule,
    MatTableModule
  ],
  providers: [],
  bootstrap: [jobtable]
})
export class AppModule { }
