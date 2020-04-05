import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from "@angular/forms";
import { NgModule } from '@angular/core';
import { TabsModule } from 'ngx-bootstrap';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
    imports: [
      BrowserModule,
      FormsModule,
      BrowserAnimationsModule,
      TabsModule.forRoot(),
    ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
