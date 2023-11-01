import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';

import * as fs from 'fs';
import * as path from 'path';

/**
 * @title Table with pagination
 */
@Component({
  selector: 'JobTable',
  templateUrl: './app.jobtable.html',
  styleUrls: []
})
export class jobtable implements AfterViewInit {
  displayedColumns: string[] = ['Job ID','Workflow','Creator','Status','Created','Run','Compute Resource','Tags'];
  
  ELEMENT_DATA: PeriodicElement[] = [];
  fileStream = fs.createReadStream('../../../../output.txt');
  
  dataSource = new MatTableDataSource<PeriodicElement>(this.ELEMENT_DATA);

  @ViewChild(MatPaginator) paginator: MatPaginator;
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }
}

export interface PeriodicElement {
  //labels= ['Job ID','Workflow','Creator','Status','Created','Run','Compute Resource','Tags']
  id: number;
  workflow: string;
  creator: string;
  status: string;
  created: Date;
  run: Date;
  resource: string;
  tags: string;
}