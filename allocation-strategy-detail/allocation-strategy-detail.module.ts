import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { AllocationStrategyDetailPage } from './allocation-strategy-detail.page';
// import { AllocationStrategyDetailPage } from './transferring-goods-detail.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: AllocationStrategyDetailPage }])
  ],
  declarations: [AllocationStrategyDetailPage]
})
export class AllocationStrategyDetailPageModule {}
