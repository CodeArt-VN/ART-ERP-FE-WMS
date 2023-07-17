import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { FileUploadModule } from 'ng2-file-upload';
import { ItemGroupDetailPage } from './item-group-detail.page';

const routes: Routes = [
  {
    path: '',
    component: ItemGroupDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ShareModule,
    IonicModule,
    ReactiveFormsModule,
    FileUploadModule,
    ShareModule,
    RouterModule.forChild(routes)
  ],
  declarations: [ItemGroupDetailPage]
})
export class ItemGroupDetailPageModule {}
