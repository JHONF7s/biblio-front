import { Component } from '@angular/core';
import { HeaderComponent } from '../../organisms/header/header.component';
import { LoanDrawerComponent } from '../../organisms/loan-drawer/loan-drawer.component';
import { ToastComponent } from '../../molecules/toast/toast.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [HeaderComponent, LoanDrawerComponent, ToastComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent { }
