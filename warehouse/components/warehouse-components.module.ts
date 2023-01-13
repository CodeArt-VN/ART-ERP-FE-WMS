import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ShareModule } from 'src/app/share.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxMaskModule } from 'ngx-mask';
import { WarehouseInputOutputInventoryComponent } from './warehouse-input-output-inventory/warehouse-input-output-inventory.component';
import { WarehouseTransactionComponent } from './warehouse-transaction/warehouse-transaction.component';
import { WarehouseItemLocationComponent } from './warehouse-item-location/warehouse-item-location.component';
import { WarehouseItemLocationLotLpnComponent } from './warehouse-item-location-lot-lpn/warehouse-item-location-lot-lpn.component';
import { WarehouseItemLotComponent } from './warehouse-item-lot/warehouse-item-lot.component';




@NgModule({
	imports: [IonicModule,
		CommonModule,
		ShareModule,
		NgSelectModule,
		NgOptionHighlightModule,
		FormsModule,
		ReactiveFormsModule,
		NgxMaskModule.forRoot(),
	],
	declarations: [
		WarehouseInputOutputInventoryComponent,
		WarehouseTransactionComponent,
		WarehouseItemLocationComponent,
		WarehouseItemLocationLotLpnComponent,
		WarehouseItemLotComponent
	],
	exports: [
		WarehouseInputOutputInventoryComponent,
		WarehouseTransactionComponent,
		WarehouseItemLocationComponent,
		WarehouseItemLocationLotLpnComponent,
		WarehouseItemLotComponent
	],
})
export class WarehouseComponentsModule { }
