import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { WMS_ItemGroupProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';

@Component({
    selector: 'app-item-group-detail',
    templateUrl: './item-group-detail.page.html',
    styleUrls: ['./item-group-detail.page.scss'],
})
export class ItemGroupDetailPage extends PageBase {

    constructor(
        public pageProvider: WMS_ItemGroupProvider,
        public env: EnvService,
        public navCtrl: NavController,
        public route: ActivatedRoute,

        public modalController: ModalController,
        public alertCtrl: AlertController,
        public navParams: NavParams,
        public formBuilder: FormBuilder,
        public cdr: ChangeDetectorRef,
        public loadingController: LoadingController,
    ) {
        super();
        this.pageConfig.isDetailPage = true;
        this.id = this.route.snapshot.paramMap.get('id');
        this.formGroup = formBuilder.group({
            IDParent: [''],
            Id: [''],
            Code: ['', Validators.required],
            Name: ['', Validators.required],
            Remark: [''],
            Sort: [''],
        });
    }

    preLoadData() {
        if (this.navParams) {
            this.item = JSON.parse(JSON.stringify(this.navParams.data.item));
            this.id = this.navParams.data.id;

            if (this.item.IDParent) {
                this.pageProvider.getAnItem(this.item.IDParent).then((itemGroup: any) => {
                    this.itemGroupSelected = { Id: itemGroup.Id, Name: itemGroup.Name };
                    if (itemGroup && this.itemGroupListSelected.findIndex(d => d.Id == itemGroup.Id) == -1) {
                        this.itemGroupListSelected.push(this.itemGroupSelected);
                    }
                }).finally(() => {
                    this.itemGroupSearch();
                });
            }
            else {
                this.itemGroupSearch();
            }
            
            this.cdr.detectChanges();
            super.loadedData();
        }
        
    }

    

    markNestedNode(ls, Id) {
        ls.filter(d => d.IDParent == Id).forEach(i => {
            i.Flag = true;
            this.markNestedNode(ls, i.Id);
        });
    }

    itemGroupList$
    itemGroupListLoading = false;
    itemGroupListInput$ = new Subject<string>();
    itemGroupListSelected = [];
    itemGroupSelected = null;
    itemGroupSearch() {
        this.itemGroupListLoading = false;
        this.itemGroupList$ = concat(
            of(this.itemGroupListSelected),
            this.itemGroupListInput$.pipe(
                distinctUntilChanged(),
                tap(() => this.itemGroupListLoading = true),
                switchMap(term => this.pageProvider.search({ Take: 5000, Skip: 0, Keyword: term })
                    .pipe(
                        catchError(() => of([])), // empty list on error
                        tap(() => this.itemGroupListLoading = false),
                        mergeMap(e => lib.buildFlatTree(e, e))
                    ))
            )
        );
    }

}
