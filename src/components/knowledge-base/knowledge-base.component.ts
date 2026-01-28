import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanadianMortgageRulesComponent } from '../canadian-mortgage-rules/canadian-mortgage-rules.component';
import { GlossaryComponent } from '../glossary/glossary.component';
import { MortgageGuideComponent } from '../mortgage-guide/mortgage-guide.component';
import { RealtorInfoComponent } from '../realtor-info/realtor-info.component';

type Tab = 'rules' | 'glossary' | 'guide' | 'realtor';

@Component({
    selector: 'app-knowledge-base',
    standalone: true,
    imports: [
        CommonModule,
        CanadianMortgageRulesComponent,
        GlossaryComponent,
        MortgageGuideComponent,
        RealtorInfoComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './knowledge-base.component.html',
})
export class KnowledgeBaseComponent {
    activeTab = signal<Tab>('guide');

    setTab(tab: Tab) {
        this.activeTab.set(tab);
    }
}
