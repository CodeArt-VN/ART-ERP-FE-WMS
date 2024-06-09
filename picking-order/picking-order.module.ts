import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { PickingOrderPage } from './picking-order.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: PickingOrderPage }])
  ],
  declarations: [PickingOrderPage]
})
export class PickingOrderPageModule {}
