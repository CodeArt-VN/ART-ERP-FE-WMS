import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { PutawayStrategyDetailPage } from './putaway-strategy-detail.page';
// import { PutawayStrategyDetailPage } from './transferring-goods-detail.page';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: PutawayStrategyDetailPage }])],
	declarations: [PutawayStrategyDetailPage],
})
export class PutawayStrategyDetailPageModule {}
