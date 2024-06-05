import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ItemDetailPage } from './item-detail.page';
import { ShareModule } from 'src/app/share.module';

const routes: Routes = [{ path: '', component: ItemDetailPage }];

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
  declarations: [ItemDetailPage],
})
export class ItemDetailPageModule {}
