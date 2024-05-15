import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ItemDetailInBranchPage } from './item-detail-in-branch.page';
import { ShareModule } from 'src/app/share.module';

const routes: Routes = [{ path: '', component: ItemDetailInBranchPage }];

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShareModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
  declarations: [ItemDetailInBranchPage],
})
export class ItemDetailInBranchPageModule {}
