import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { CycleCountDetailPage } from './cycle-count-detail.page';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: CycleCountDetailPage }])],
	declarations: [CycleCountDetailPage],
})
export class CycleCountDetailPageModule {}
