import { beforeEach, describe, expect, it } from "vitest";
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AppComponent
            ],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.debugElement.componentInstance;
        expect(app).toBeTruthy();
    });

    it(`should have as title 'pizza-calculator'`, () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.debugElement.componentInstance;
        expect(app.title).toEqual('pizza-calculator');
    });

    it('should render the dough title in a h2 tag', () => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const compiled = fixture.debugElement.nativeElement;
        expect(compiled.querySelector('h2').textContent).toContain('Pâte à pizza');
    });

    it('should recompute and render the total dough weight after a real user input event, with no manual detectChanges call', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        // Relies on Angular's zoneless change-detection notification (event bindings
        // mark the view dirty on their own) rather than a manual detectChanges() call,
        // to catch any regression from removing zone.js.
        fixture.autoDetectChanges();
        await fixture.whenStable();

        const compiled = fixture.debugElement.nativeElement;
        const adultCountInput = compiled.querySelector('input[type="number"]') as HTMLInputElement;

        adultCountInput.value = '5';
        adultCountInput.dispatchEvent(new Event('input'));
        await fixture.whenStable();

        expect(compiled.querySelector('p').textContent).toContain('1200g');
    });
});
