import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { AllocateStrategyDetailPage } from './allocate-strategy-detail.page';
// import { AllocateStrategyDetailPage } from './transferring-goods-detail.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: AllocateStrategyDetailPage }])
  ],
  declarations: [AllocateStrategyDetailPage]
})
export class AllocateStrategyDetailPageModule {}
