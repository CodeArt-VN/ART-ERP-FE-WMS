import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { StorerDetailPage } from './storer-detail.page';
import { MapCompsModule } from 'src/app/components/map-comps/map-comps.module';

const routes: Routes = [
	{
		path: '',
		component: StorerDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, MapCompsModule, RouterModule.forChild(routes)],
	declarations: [StorerDetailPage],
})
export class StorerDetailPageModule {}
