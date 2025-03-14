import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ShareModule } from 'src/app/share.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WarehouseItemLocationComponent } from './warehouse-item-location/warehouse-item-location.component';
import { WarehouseItemLocationLotLpnComponent } from './warehouse-item-location-lot-lpn/warehouse-item-location-lot-lpn.component';
import { WarehouseItemLotComponent } from './warehouse-item-lot/warehouse-item-lot.component';

@NgModule({
	imports: [IonicModule, CommonModule, ShareModule, FormsModule, ReactiveFormsModule],
	declarations: [WarehouseItemLocationComponent, WarehouseItemLocationLotLpnComponent, WarehouseItemLotComponent],
	exports: [WarehouseItemLocationComponent, WarehouseItemLocationLotLpnComponent, WarehouseItemLotComponent],
})
export class WarehouseComponentsModule {}
