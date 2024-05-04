import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component'
import { WorkflowFormComponent } from './components/workflow-form/workflow-form.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { JobsTableComponent } from './components/jobs-table/jobs-table.component';
import { TestButtonsComponent } from './components/api-test-page/api-test-page.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { RegisterNewUserComponent } from './components/register-new-user/register-new-user.component';
import { AuthGuard } from './guards/auth.guard';


  export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'login', component: LoginComponent },
    { path: 'workflow-form', component: WorkflowFormComponent, canActivate: [AuthGuard],data: { roles: ['admin', 'user'] } },
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'user'] } },
    { path: 'job-table', component: JobsTableComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'user'] } },
    { path: 'admin-panel', component: AdminPanelComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
    { path: 'register-new-user', component: RegisterNewUserComponent },
    { path: 'api-test', component: TestButtonsComponent, canActivate: [AuthGuard], data: { roles: ['admin'] }}

];
