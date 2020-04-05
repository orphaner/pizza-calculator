import {AfterViewInit, Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'pizza-calculator';

  adultCount: number = 2;
  adultWeight: number = 220;
  childCount: number = 2;
  childWeight: number = 50;

  paramWaterPercent: number = 60;
  paramSaltPerFlourKg: number = 14;
  paramYeastPerFlourKg: number = 7;

  flourWeight: number = null;
  waterWeight: number = null;
  saltWeight: number = null;
  yeastWeight: number = null;


  ngOnInit(): void {
    this.calculate();
  }

  valueChange(v: any) {
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
