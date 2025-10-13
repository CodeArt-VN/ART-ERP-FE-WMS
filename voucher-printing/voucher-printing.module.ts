import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { VoucherPrintingPage } from './voucher-printing.page';
const routes: Routes = [
	{
		path: '',
		component: VoucherPrintingPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
	// imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, ShareModule, RouterModule.forChild([{ path: '', component: VoucherPrintingPage }])],
	declarations: [VoucherPrintingPage],
})
export class VoucherPrintingPageModule {}
