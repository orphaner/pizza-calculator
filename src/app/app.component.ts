import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TabsModule} from 'ngx-bootstrap/tabs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [FormsModule, TabsModule]
})
export class AppComponent implements OnInit {
  title = 'pizza-calculator';

  adultCount = 2;
  adultWeight = 220;
  childCount = 2;
  childWeight = 100;

  paramWaterPercent = 65;
  paramSaltPerFlourKg = 14;
  paramYeastPerFlourKg = 7;
  paramOliveOilPerFlourKg = 60;

  useBigga = true;
  biggaFlourPercent = 75;

  flourWeight = 0;
  waterWeight = 0;
  saltWeight = 0;
  yeastWeight = 0;
  oliveOilWeight = 0;

  biggaFlourWeight = 0;
  biggaWaterWeight = 0;
  biggaYeastWeight = 0;
  finalFlourWeight = 0;
  finalWaterWeight = 0;
  finalYeastWeight = 0;


  ngOnInit(): void {
    this.calculate();
  }

  valueChange(): void {
    this.calculate();
  }

  private calculate(): void {
    const finalWeight = this.adultWeight * this.adultCount + this.childWeight * this.childCount;
    this.flourWeight = Math.round(finalWeight / (1 + this.paramWaterPercent / 100));
    this.waterWeight = finalWeight - this.flourWeight;
    this.saltWeight = (this.flourWeight * this.paramSaltPerFlourKg) / 1000;
    this.saltWeight = Math.round(this.saltWeight * 100) / 100;
    this.yeastWeight = (this.flourWeight * this.paramYeastPerFlourKg) / 1000;
    this.yeastWeight = Math.round(this.yeastWeight * 100) / 100;
    this.oliveOilWeight = (this.flourWeight * this.paramOliveOilPerFlourKg) / 1000;
    this.oliveOilWeight = Math.round(this.oliveOilWeight * 100) / 100

    this.biggaFlourWeight = Math.round(this.flourWeight * this.biggaFlourPercent / 100);
    this.finalFlourWeight = this.flourWeight - this.biggaFlourWeight;
    this.biggaWaterWeight = Math.round(this.biggaFlourWeight * 0.5);
    this.finalWaterWeight = this.waterWeight - this.biggaWaterWeight;
    this.biggaYeastWeight = Math.round(this.yeastWeight * this.biggaFlourPercent / 100 * 100) / 100;
    this.finalYeastWeight = Math.round((this.yeastWeight - this.biggaYeastWeight) * 100) / 100;
  }
}
