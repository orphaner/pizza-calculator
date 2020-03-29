import {AfterViewInit, Component, Input} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'pizza-calculator';

  private adultCount: number = 2;
  private adultWeight: number = 220;
  private childCount: number = 2;
  private childWeight: number = 50;

  private paramWaterPercent: number = 60;
  private paramSaltPerFlourKg: number = 14;
  private paramYeastPerFlourKg: number = 7;

  private flourWeight: number = null;
  private waterWeight: number = null;
  private saltWeight: number = null;
  private yeastWeight: number = null;


  ngAfterViewInit(): void {
    this.calculate();
  }

  private valueChange(v: any) {
    this.calculate();
  }

  private calculate(): void {
    const finalWeight = this.adultWeight * this.adultCount + this.childWeight * this.childCount;
    this.flourWeight = Math.round(finalWeight / (1 + this.paramWaterPercent / 100));
    this.waterWeight = finalWeight - this.flourWeight;
    this.saltWeight = (this.flourWeight * this.paramSaltPerFlourKg) / 1000;
    this.saltWeight = Math.round(this.saltWeight * 100) / 100
    this.yeastWeight = (this.flourWeight * this.paramYeastPerFlourKg) / 1000;
    this.yeastWeight = Math.round(this.yeastWeight * 100) / 100
  }
}
