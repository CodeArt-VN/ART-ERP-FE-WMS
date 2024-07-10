import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/app.guard';

export const WMSRoutes: Routes = [

    { path: 'warehouse', loadChildren: () => import('./warehouse/warehouse.module').then(m => m.WarehousePageModule), canActivate: [AuthGuard] },
    { path: 'warehouse/:segment/:id', loadChildren: () => import('./warehouse/warehouse.module').then(m => m.WarehousePageModule), canActivate: [AuthGuard] },
    // { path: 'warehouse-transaction', loadChildren: () => import('./warehouse-transaction/warehouse-transaction.module').then(m => m.WarehouseTransactionPageModule), canActivate: [AuthGuard] },
    // { path: 'item-location', loadChildren: () => import('./item-location/item-location.module').then(m => m.ItemLocationPageModule), canActivate: [AuthGuard] },
    // { path: 'item-lot-lpn', loadChildren: () => import('./item-lot-lpn/item-lot-lpn.module').then(m => m.itemLotLPNPageModule), canActivate: [AuthGuard] },
    { path: 'zone', loadChildren: () => import('./zone/zone.module').then(m => m.ZonePageModule), canActivate: [AuthGuard] },
    { path: 'zone/:id', loadChildren: () => import('./zone-detail/zone-detail.module').then(m => m.ZoneDetailPageModule), canActivate: [AuthGuard] },
    
    { path: 'location', loadChildren: () => import('./location/location.module').then(m => m.LocationPageModule), canActivate: [AuthGuard] },
    { path: 'location/:id', loadChildren: () => import('./location-detail/location-detail.module').then(m => m.LocationDetailPageModule), canActivate: [AuthGuard] },
   
    { path: 'item-group', loadChildren: () => import('./item-group/item-group.module').then(m => m.ItemGroupPageModule), canActivate: [AuthGuard] },
    { path: 'item-group/:id', loadChildren: () => import('./item-group-detail/item-group-detail.module').then(m => m.ItemGroupDetailPageModule), canActivate: [AuthGuard] },
    
    { path: 'item', loadChildren: () => import('./item/item.module').then(m => m.ItemPageModule), canActivate: [AuthGuard] },
    { path: 'item/:id', loadChildren: () => import('./item-detail/item-detail.module').then(m => m.ItemDetailPageModule), canActivate: [AuthGuard] },
    { path: 'item/uom/:id', loadChildren: () => import('./item-uom-detail/item-uom-detail.module').then(m => m.ItemUomDetailPageModule), canActivate: [AuthGuard] },
    
    { path: 'batch-picking', loadChildren: () => import('./batch-picking/batch-picking.module').then(m => m.BatchPickingPageModule), canActivate: [AuthGuard] },
    { path: 'returned-list', loadChildren: () => import('./returned-list/returned-list.module').then(m => m.ReturnedLlistPageModule), canActivate: [AuthGuard] },
    
    { path: 'receipt', loadChildren: () => import('./receipt/receipt.module').then(m => m.ReceiptPageModule), canActivate: [AuthGuard] },
    { path: 'receipt/:id', loadChildren: () => import('./receipt-detail/receipt-detail.module').then(m => m.ReceiptDetailPageModule), canActivate: [AuthGuard] },
    
    { path: 'carton', loadChildren: () => import('./carton/carton.module').then(m => m.CartonPageModule), canActivate: [AuthGuard] },
    { path: 'carton/:id', loadChildren: () => import('./carton-detail/carton-detail.module').then(m => m.CartonDetailPageModule), canActivate: [AuthGuard] },
    
    { path: 'goods-receiving', loadChildren: () => import('./goods-receiving/goods-receiving.module').then(m => m.GoodsReceivingPageModule), canActivate: [AuthGuard] },
    { path: 'goods-receiving/:id', loadChildren: () => import('./goods-receiving-detail/goods-receiving-detail.module').then(m => m.GoodReceivingDetailPageModule), canActivate: [AuthGuard] },
    
    { path: 'lpn-label', loadChildren: () => import('./lpn-label/lpn-label.module').then(m => m.LPNLabelPageModule), canActivate: [AuthGuard] },
    { path: 'lpn-label/:id', loadChildren: () => import('./lpn-label/lpn-label.module').then(m => m.LPNLabelPageModule), canActivate: [AuthGuard] },
    
    { path: 'serial-label', loadChildren: () => import('./serial-label/serial-label.module').then(m => m.SerialLabelPageModule), canActivate: [AuthGuard] },
    { path: 'item-uom-label', loadChildren: () => import('./item-uom-label/item-uom-label.module').then(m => m.ItemUomLabelPageModule), canActivate: [AuthGuard] },
    
    { path: 'pos-table-label', loadChildren: () => import('./pos-table-label/pos-table-label.module').then(m => m.POSTableLabelPageModule), canActivate: [AuthGuard] },

    { path: 'cycle-count', loadChildren: () => import('./cycle-count/cycle-count.module').then(m => m.CycleCountPageModule), canActivate: [AuthGuard] },
    { path: 'cycle-count/:id', loadChildren: () => import('./cycle-count-detail/cycle-count-detail.module').then(m => m.CycleCountDetailPageModule), canActivate: [AuthGuard] },
    { path: 'cycle-count-note', loadChildren: () => import('./cycle-count-note/cycle-count-note.module').then(m => m.CycleCountNotePageModule), canActivate: [AuthGuard] },
    { path: 'cycle-count-note/:id', loadChildren: () => import('./cycle-count-note/cycle-count-note.module').then(m => m.CycleCountNotePageModule), canActivate: [AuthGuard] },
    
    { path: 'adjustment', loadChildren: () => import('./adjustment/adjustment.module').then(m => m.AdjustmentPageModule), canActivate: [AuthGuard]},
    { path: 'adjustment/:id', loadChildren: () => import('./adjustment-detail/adjustment-detail.module').then(m => m.AdjustmentDetailPageModule), canActivate: [AuthGuard]},

    { path: 'outbound-order', loadChildren: () => import('./outbound-order/outbound-order.module').then(m => m.OutboundOrderPageModule), canActivate: [AuthGuard]},
    { path: 'outbound-order/:id', loadChildren: () => import('./outbound-order-detail/outbound-order-detail.module').then(m => m.OutboundOrderDetailPageModule), canActivate: [AuthGuard]},

    { path: 'picking-order', loadChildren: () => import('./picking-order/picking-order.module').then(m => m.PickingOrderPageModule), canActivate: [AuthGuard]},
    { path: 'picking-order/:id', loadChildren: () => import('./picking-order-detail/picking-order-detail.module').then(m => m.PickingOrderDetailPageModule), canActivate: [AuthGuard]},
    
    { path: 'packing-order', loadChildren: () => import('./packing-order/packing-order.module').then(m => m.PackingOrderPageModule), canActivate: [AuthGuard]},
    { path: 'packing-order/:id', loadChildren: () => import('./packing-order-detail/packing-order-detail.module').then(m => m.PackingOrderDetailPageModule), canActivate: [AuthGuard]},
    
    { path: 'shipping', loadChildren: () => import('./shipping/shipping.module').then(m => m.ShippingPageModule), canActivate: [AuthGuard]},
    { path: 'shipping/:id', loadChildren: () => import('./shipping-detail/shipping-detail.module').then(m => m.ShippingDetailPageModule), canActivate: [AuthGuard]},

    // { path: 'picking-rules', loadChildren: () => import('./picking-rules/picking-rules.module').then(m => m.PickingRulesPageModule), canActivate: [AuthGuard]},
    { path: 'allocate-strategy', loadChildren: () => import('./allocate-strategy-detail/allocate-strategy-detail.module').then(m => m.AllocateStrategyDetailPageModule), canActivate: [AuthGuard]},
    { path: 'allocate-strategy/:id', loadChildren: () => import('./allocate-strategy-detail/allocate-strategy-detail.module').then(m => m.AllocateStrategyDetailPageModule), canActivate: [AuthGuard]},

];
