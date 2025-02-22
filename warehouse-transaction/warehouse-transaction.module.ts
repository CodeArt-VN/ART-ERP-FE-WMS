import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { WarehouseTransactionPage } from './warehouse-transaction.page';

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild([{ path: '', component: WarehouseTransactionPage }])],
	declarations: [WarehouseTransactionPage],
})
export class WarehouseTransactionPageModule {}
