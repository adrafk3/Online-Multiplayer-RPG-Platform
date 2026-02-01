import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ItemCounts, GameSizes, ItemId } from '@common/enums';
import { BoardCell } from '@common/interfaces';

@Injectable({
    providedIn: 'root',
})
export class DragDropService {
    private isDragging: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private _isDragging$ = this.isDragging.asObservable();
    private itemCounter: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private startCounter: BehaviorSubject<number> = new BehaviorSubject<number>(0);

    get isDragging$() {
        return this._isDragging$;
    }
    getIsDragging() {
        return this.isDragging.value;
    }
    setIsDragging(isDragging: boolean): void {
        this.isDragging.next(isDragging);
    }
    incrementObject(item: HTMLElement): void {
        if (item.id.includes(ItemId.ItemStartingPoint)) {
            this.incrementStartCounter();
        } else if (/\d/.test(item.id)) {
            this.incrementItemCounter();
        }
    }
    decrementObject(item: HTMLElement) {
        if (item.id.includes(ItemId.ItemStartingPoint)) {
            this.decrementStartCounter();
        } else if (/\d/.test(item.id)) {
            this.decrementItemCounter();
        }
    }
    observeItemCounter(): BehaviorSubject<number> {
        return this.itemCounter;
    }

    observeStartCounter(): BehaviorSubject<number> {
        return this.startCounter;
    }

    setItemCounter(value: number): void {
        let itemCount: number;
        switch (value) {
            case GameSizes.Small:
                itemCount = ItemCounts.SmallItem;
                break;
            case GameSizes.Medium:
                itemCount = ItemCounts.MediumItem;
                break;
            case GameSizes.Big:
                itemCount = ItemCounts.BigItem;
                break;
            default:
                itemCount = ItemCounts.MediumItem;
        }
        this.startCounter.next(itemCount);
        this.itemCounter.next(itemCount);
    }

    onDragStart(event: DragEvent, item: string, itemDescription: string): void {
        this.setIsDragging(true);
        event.dataTransfer?.setData('text', item + ',' + itemDescription);

        const target = event.target as HTMLElement;

        if (target) {
            this.setDraggable(target, false);
        }
    }

    onDragEnd(event: DragEvent) {
        const draggedItem = event.target as HTMLElement;
        const didNotDrop = this.getIsDragging();
        if (didNotDrop) {
            if (draggedItem) {
                this.setDraggable(draggedItem, true);
            }
        } else if (/\d/.test(draggedItem.id)) {
            this.itemCounter.next(this.itemCounter.value - 1);
        } else if (draggedItem.id.includes(ItemId.ItemStartingPoint)) {
            this.startCounter.next(this.startCounter.value - 1);
        }
        this.setIsDragging(false);
        event.preventDefault();
        if (draggedItem?.parentElement?.classList.contains('item-container')) {
            this.setDraggable(draggedItem, true);
        } else if (draggedItem?.parentElement?.classList.contains('tile')) {
            this.setDraggable(draggedItem, true);
            event.preventDefault();
        }

        event.stopImmediatePropagation();
    }

    setDraggable(draggedItem: HTMLElement, draggable: boolean) {
        if (draggable) {
            draggedItem.style.opacity = '1';
            draggedItem.draggable = true;
            draggedItem.style.cursor = 'grab';
        } else {
            draggedItem.style.opacity = '0.40';
            draggedItem.draggable = false;
            draggedItem.style.cursor = 'default';
        }
    }

    giveItemId(id: string, grid: BoardCell[][]) {
        if (id === ItemId.Item7 || id === ItemId.ItemStartingPoint) {
            const items: string[] = [];
            for (const row of grid) {
                for (const tile of row) {
                    if (tile.item.name.includes(id)) {
                        items.push(tile.item.name);
                    }
                }
            }
            const newId = id;
            let suffix = 'A';
            while (items.includes(newId + suffix)) {
                suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
                if (suffix > 'Z') {
                    suffix = 'A' + (parseInt(suffix.slice(1) || '0', 10) + 1);
                }
            }
            return newId + suffix;
        } else return id;
    }
    incrementItemCounter(): void {
        this.itemCounter.next(this.itemCounter.value + 1);
    }
    incrementStartCounter(): void {
        this.startCounter.next(this.startCounter.value + 1);
    }
    private decrementItemCounter(): void {
        this.itemCounter.next(this.itemCounter.value - 1);
    }
    private decrementStartCounter(): void {
        this.startCounter.next(this.startCounter.value - 1);
    }
}
