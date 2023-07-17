import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WarehousePage } from './warehouse.page';
import { ShareModule } from 'src/app/share.module';
import { WarehouseComponentsModule } from './components/warehouse-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    WarehouseComponentsModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: WarehousePage }])
  ],
  declarations: [WarehousePage]
})
export class WarehousePageModule {}
