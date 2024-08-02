import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { UoMDetailPage } from './uom-detail.page';

const routes: Routes = [
  {
    path: '',
    component: UoMDetailPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ShareModule,
    IonicModule,
    ReactiveFormsModule,
    ShareModule,
    RouterModule.forChild(routes),
  ],
  declarations: [UoMDetailPage],
})
export class UoMDetailPageModule {}
