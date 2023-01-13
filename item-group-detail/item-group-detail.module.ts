import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { FileUploadModule } from 'ng2-file-upload';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { NgxMaskModule, IConfig } from 'ngx-mask'
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
    NgSelectModule,
    NgOptionHighlightModule,
    ShareModule,
    NgxMaskModule.forRoot(),
    RouterModule.forChild(routes)
  ],
  declarations: [ItemGroupDetailPage]
})
export class ItemGroupDetailPageModule {}
