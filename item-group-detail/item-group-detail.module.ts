import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ItemGroupDetailPage } from './item-group-detail.page';
import { ShareModule } from 'src/app/share.module';

const routes: Routes = [{ path: '', component: ItemGroupDetailPage }];

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
  declarations: [ItemGroupDetailPage],
})
export class ItemGroupDetailPageModule {}
