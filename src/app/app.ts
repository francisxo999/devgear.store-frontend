import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
  imports: [RouterOutlet]
})

export class App implements OnInit {
  isLoggedIn = false;
  username: string | undefined = '';

  constructor(private msalService: MsalService) {}

  ngOnInit() {
    this.msalService.instance.initialize().then(() => {
      this.msalService.handleRedirectObservable().subscribe({
        next: () => this.checkAccount(),
        error: (error) => console.error(error)
      });
    });
  }

  checkAccount() {
    const accounts: AccountInfo[] = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      this.isLoggedIn = true;
      this.username = accounts[0].name;
    }
  }

  login() {
    this.msalService.loginRedirect();
  }

  logout() {
    this.msalService.logoutRedirect();
  }
}