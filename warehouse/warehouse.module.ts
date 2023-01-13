import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WarehousePage } from './warehouse.page';
import { ShareModule } from 'src/app/share.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { WarehouseComponentsModule } from './components/warehouse-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    WarehouseComponentsModule,
    ShareModule,
    NgSelectModule,
    NgOptionHighlightModule,
    RouterModule.forChild([{ path: '', component: WarehousePage }])
  ],
  declarations: [WarehousePage]
})
export class WarehousePageModule {}
