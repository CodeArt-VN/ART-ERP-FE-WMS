import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { WarehouseInputOutputInventoryPage } from './warehouse-input-output-inventory.page';

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild([{ path: '', component: WarehouseInputOutputInventoryPage }])],
	declarations: [WarehouseInputOutputInventoryPage],
})
export class WarehouseInputOutputInventoryPageModule {}
