import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QRCodeLabelPage } from './qr-code-label.page';
import { ShareModule } from 'src/app/share.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ShareModule,
    RouterModule.forChild([{ path: '', component: QRCodeLabelPage }]),
  ],
  declarations: [QRCodeLabelPage],
})
export class QRCodeLabelPageModule {}
