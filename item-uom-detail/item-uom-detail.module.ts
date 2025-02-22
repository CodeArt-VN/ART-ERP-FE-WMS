import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ItemUomDetailPage } from './item-uom-detail.page';
import { ShareModule } from 'src/app/share.module';

const routes: Routes = [
	{
		path: '',
		component: ItemUomDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, ShareModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [ItemUomDetailPage],
})
export class ItemUomDetailPageModule {}
