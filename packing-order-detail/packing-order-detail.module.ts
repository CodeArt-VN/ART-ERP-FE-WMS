import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { PackingOrderDetailPage } from './packing-order-detail.page';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: PackingOrderDetailPage }])],
	declarations: [PackingOrderDetailPage],
})
export class PackingOrderDetailPageModule {}
