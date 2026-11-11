import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LibraryService } from '../../../../core/services/library.service';
import { ButtonComponent } from '../../atoms/button/button.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ButtonComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly libraryService = inject(LibraryService);

  // Directly bind to computed signal from shared store
  readonly loansCount = this.libraryService.totalLoansCount;

  onOpenLoans(): void {
    this.libraryService.openDrawer();
  }
}
