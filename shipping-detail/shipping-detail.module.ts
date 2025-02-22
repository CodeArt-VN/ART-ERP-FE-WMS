import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { ShippingDetailPage } from './shipping-detail.page';
import { TransactionModalPage } from '../transaction-modal/transaction-modal.page';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: ShippingDetailPage }])],
	declarations: [ShippingDetailPage, TransactionModalPage],
})
export class ShippingDetailPageModule {}
