import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LPNLabelPage } from './lpn-label';
import { ShareModule } from 'src/app/share.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { NgOptionHighlightModule } from '@ng-select/ng-option-highlight';
import { FileUploadModule } from 'ng2-file-upload';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    FileUploadModule,
    ShareModule,
    PipesModule,
    RouterModule.forChild([{ path: '', component: LPNLabelPage }])
  ],
  declarations: [LPNLabelPage]
})
export class LPNLabelPageModule {}
