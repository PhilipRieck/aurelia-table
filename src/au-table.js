import {inject, bindable, bindingMode, BindingEngine} from "aurelia-framework";

@inject(BindingEngine)
export class AureliaTableCustomAttribute {

    @bindable data;
    @bindable({defaultBindingMode: bindingMode.twoWay}) displayData;

    @bindable filterText;
    @bindable filterKeys;

    @bindable({defaultBindingMode: bindingMode.twoWay}) currentPage;
    @bindable pageSize;
    @bindable({defaultBindingMode: bindingMode.twoWay}) totalItems;

    @bindable({defaultBindingMode: bindingMode.twoWay}) api;

    isAttached = false;

    sortKey;
    sortOrder;
    sortChangedListeners = [];
    beforePagination = [];

    dataObserver;

    constructor(bindingEngine) {
        this.bindingEngine = bindingEngine;
    }

    bind() {
        if (this.data) {
            this.dataObserver = this.bindingEngine.collectionObserver(this.data)
                .subscribe(() => this.applyPlugins())
        }

        this.api = {
            revealItem: (item) => this.revealItem(item)
        }
    }

    attached() {
        this.isAttached = true;
        this.applyPlugins();
    }

    detached() {
        if (this.dataObserver) {
            this.dataObserver.dispose();
        }
    }

    filterTextChanged() {
        if (this.hasPagination()) {
            this.currentPage = 1;
        }
        this.applyPlugins();
    }

    filterKeysChanged() {
        if (this.hasPagination()) {
            this.currentPage = 1;
        }
        this.applyPlugins();
    }

    currentPageChanged() {
        this.applyPlugins();
    }

    pageSizeChanged() {
        this.applyPlugins();
    }

    /**
     * Copies the data into the display data
     */
    getDataCopy() {
        return [].concat(this.data);
    }

    /**
     * Applies all the plugins to the display data
     */
    applyPlugins() {
        if (!this.isAttached || !this.data) {
            return;
        }

        let localData = this.getDataCopy();

        if (this.hasFilter()) {
            localData = this.doFilter(localData);
        }

        if (this.sortKey && this.sortOrder !== 0) {
            this.doSort(localData, this.sortKey, this.sortOrder);
        }

        this.totalItems = localData.length;

        if (this.hasPagination()) {
            this.beforePagination = [].concat(localData);
            localData = this.doPaginate(localData);
        }

        this.displayData = localData;
    }

    doFilter(toFilter) {
        let filteredData = [];
        
        for (let next of toFilter) {
            for (let key of this.filterKeys) {

                if( next[key]!= null ){
                    let value = next[key].toString().toLowerCase();

                    if (value.indexOf(this.filterText.toLowerCase()) > -1) {
                        filteredData.push(next);
                        break;
                    }
                }
            }
        }

        return filteredData;
    }

    doSort(toSort, sortKey, sortOrder) {
        toSort.sort((a, b) => {

            let val1;
            let val2;

            if (typeof sortKey === "function") {
                val1 = sortKey(a, sortOrder);
                val2 = sortKey(b, sortOrder);
            } else {
                val1 = a[sortKey];
                val2 = b[sortKey];
            }

            if(val1 == null) val1 = "";
            if(val2 == null) val2 = "";

            if (this.isNumeric(val1) && this.isNumeric(val2)) {               
                return (val1 - val2) * sortOrder;
            } else {
                let str1 = val1.toString();
                let str2 = val2.toString();

                return str1.localeCompare(str2) * sortOrder;
            }
        });
    }

    isNumeric(toCheck){
        return !isNaN(parseFloat(toCheck)) && isFinite(toCheck);
    }

    doPaginate(toPaginate) {
        if (toPaginate.length <= this.pageSize) {
            return toPaginate;
        }

        let start = (this.currentPage - 1) * this.pageSize;

        let end = start + this.pageSize;

        return toPaginate.slice(start, end);
    }

    hasFilter() {
        return this.filterText && (typeof this.filterText === 'string' || this.filterText instanceof String)
            && this.filterText.trim().length > 0 && this.filterKeys.length > 0;
    }

    hasPagination() {
        return this.currentPage > 0;
    }

    dataChanged() {
        if (this.dataObserver) {
            this.dataObserver.dispose();
        }

        this.dataObserver = this.bindingEngine.collectionObserver(this.data)
            .subscribe(() => this.applyPlugins());

        this.applyPlugins();
    }

    sortChanged(key, order) {
        this.sortKey = key;
        this.sortOrder = order;
        this.applyPlugins();
        this.emitSortChanged();
    }

    addSortChangedListener(callback) {
        this.sortChangedListeners.push(callback);
    }

    removeSortChangedListener(callback) {
        this.removeListener(callback, this.sortChangedListeners)
    }

    emitSortChanged() {
        for (let listener of this.sortChangedListeners) {
            listener();
        }
    }

    removeListener(callback, listeners) {
        var index = listeners.indexOf(callback);

        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    revealItem(item) {
        if (!this.hasPagination()) {
            return true;
        }

        let index = this.beforePagination.indexOf(item);

        if (index === -1) {
            return false;
        }

        this.currentPage = Math.ceil((index + 1) / this.pageSize);

        return true;
    }

}