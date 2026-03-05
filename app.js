class CanvasEditor {
    constructor() {
        this.canvasId = '76950e47-236b-429e-8360-42b24650142c';
        this.model = this.loadInitialModel();
        this.gridSize = 12;
        this.currentGridCols = 12;
        this.cellWidth = 0;
        this.cellHeight = 0;
        this.draggedWidget = null;
        this.ghostElement = null;
        this.screenMode = 'desktop';
        this.init();
    }

    loadInitialModel() {
        return {
            "76950e47-236b-429e-8360-42b24650142c": {
                "component": "layout",
                "properties": {
                    "b4325dbb-c90b-499a-869e-5c9809c3751c": {
                        "component": "widget",
                        "description": "Звонки",
                        "layout": {
                            "row": 1,
                            "col": 1,
                            "rowSpan": 2,
                            "colSpan": 2
                        }
                    },
                    "133a5d06-08e1-47ed-8a54-b78ec3312f47": {
                        "component": "widget",
                        "description": "ИИ-Болван. Сказочный",
                        "layout": {
                            "row": 1,
                            "col": 3,
                            "rowSpan": 1,
                            "colSpan": 1
                        }
                    }
                }
            }
        };
    }

    init() {
        this.detectScreenMode();
        this.updateGridDimensions();
        this.renderWidgets();
        this.attachEventListeners();
        
        // Обработчик изменения размера окна с debounce
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const oldMode = this.screenMode;
                this.detectScreenMode();
                this.updateGridDimensions();
                
                // Если изменился режим экрана, перерисовываем виджеты
                if (oldMode !== this.screenMode) {
                    this.renderWidgets();
                }
            }, 250);
        });
    }

    detectScreenMode() {
        const width = window.innerWidth;
        let newMode = 'desktop';
        let cols = 12;
        
        if (width < 576) {
            newMode = 'mobile';
            cols = 1;
        } else if (width < 768) {
            newMode = 'tablet';
            cols = 6;
        }
        
        this.screenMode = newMode;
        this.currentGridCols = cols;
        
        // Обновляем индикатор режима
        const indicator = document.getElementById('screenMode');
        if (indicator) {
            indicator.textContent = `${newMode.charAt(0).toUpperCase() + newMode.slice(1)} (${cols} cols)`;
        }
    }

    updateGridDimensions() {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        this.cellWidth = rect.width / this.currentGridCols;
        
        // Для мобильных устройств используем фиксированную высоту ячейки
        if (this.screenMode === 'mobile') {
            this.cellHeight = 100;
        } else if (this.screenMode === 'tablet') {
            this.cellHeight = 80;
        } else {
            this.cellHeight = rect.height / this.gridSize;
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Адаптация позиции виджета под текущий размер экрана
    adaptPosition(layout) {
        const adapted = { ...layout };
        
        if (this.screenMode === 'mobile') {
        // В мобильной версии максимум 3 колонки
        adapted.colSpan = Math.min(layout.colSpan, 3);
        adapted.col = Math.min(layout.col, 3 - adapted.colSpan + 1);
    } else if (this.screenMode === 'tablet') {
        // В планшетной версии максимум 6 колонок
        adapted.colSpan = Math.min(layout.colSpan, 6);
        adapted.col = Math.min(layout.col, 6 - adapted.colSpan + 1);
        }
        
        return adapted;
    }

    // Реорганизация виджетов для мобильных устройств
    reorganizeForMobile() {
        const properties = this.model[this.canvasId].properties;
        const widgets = Object.keys(properties).map(id => ({
            id,
            ...properties[id]
        }));
        
        // Сортируем виджеты по позиции (сначала по row, потом по col)
        widgets.sort((a, b) => {
            if (a.layout.row !== b.layout.row) {
                return a.layout.row - b.layout.row;
            }
            return a.layout.col - b.layout.col;
        });
        
        // Временные адаптированные позиции для отображения
        const adaptedPositions = {};
        let currentRow = 1;
        let currentCol = 1;
        
        widgets.forEach(widget => {
            const adaptedLayout = this.adaptPosition(widget.layout);
            
            // Если виджет не помещается в текущую строку
            if (currentCol + adaptedLayout.colSpan - 1 > this.currentGridCols) {
                currentRow++;
                currentCol = 1;
            }
            
            adaptedPositions[widget.id] = {
                row: currentRow,
                col: currentCol,
                rowSpan: adaptedLayout.rowSpan,
                colSpan: adaptedLayout.colSpan
            };
            
            currentCol += adaptedLayout.colSpan;
            
            // Переход на новую строку если достигли конца
            if (currentCol > this.currentGridCols) {
                currentRow++;
                currentCol = 1;
            }
        });
        
        return adaptedPositions;
    }

    renderWidgets() {
        const canvas = document.getElementById('canvas');
        canvas.innerHTML = '';
        
        const properties = this.model[this.canvasId].properties;
        let adaptedPositions = null;
        
        // Для мобильных и планшетных устройств реорганизуем виджеты
        if (this.screenMode !== 'desktop') {
            adaptedPositions = this.reorganizeForMobile();
        }
        
        Object.keys(properties).forEach(widgetId => {
            const widget = properties[widgetId];
            const displayLayout = adaptedPositions ? adaptedPositions[widgetId] : widget.layout;
            this.createWidgetElement(widgetId, widget, displayLayout);
        });
    }

    createWidgetElement(widgetId, widgetData, displayLayout = null) {
        const canvas = document.getElementById('canvas');
        const widgetEl = document.createElement('div');
        widgetEl.className = 'widget';
        widgetEl.dataset.widgetId = widgetId;
        widgetEl.draggable = true;
        
        // Используем переданный layout для отображения или оригинальный
        const layout = displayLayout || widgetData.layout;
        
        // Позиционирование в grid
        widgetEl.style.gridColumn = `${layout.col} / span ${layout.colSpan}`;
        widgetEl.style.gridRow = `${layout.row} / span ${layout.rowSpan}`;
        
        widgetEl.innerHTML = `
            <div class="widget-header">
                <span>${widgetData.description}</span>
                <button class="widget-delete" onclick="canvasEditor.deleteWidget('${widgetId}')">вњ•</button>
            </div>
            <div class="widget-body">
                ${layout.rowSpan}x${layout.colSpan}
            </div>
        `;
        
        // Drag events только для desktop
        if (this.screenMode === 'desktop') {
            widgetEl.addEventListener('dragstart', (e) => this.handleDragStart(e, widgetId));
            widgetEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
        } else {
            widgetEl.draggable = false;
            widgetEl.style.cursor = 'default';
        }
        
        canvas.appendChild(widgetEl);
    }

    handleDragStart(e, widgetId) {
        if (this.screenMode !== 'desktop') {
            e.preventDefault();
            return;
        }
        
        this.draggedWidget = widgetId;
        e.target.classList.add('dragging');
        
        this.createGhost(this.model[this.canvasId].properties[widgetId]);
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }
        this.draggedWidget = null;
    }

    createGhost(widgetData) {
        const canvas = document.getElementById('canvas');
        this.ghostElement = document.createElement('div');
        this.ghostElement.className = 'ghost-widget';
        this.ghostElement.style.display = 'none';
        canvas.appendChild(this.ghostElement);
    }

    attachEventListeners() {
        const canvas = document.getElementById('canvas');
        
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!this.draggedWidget || !this.ghostElement || this.screenMode !== 'desktop') return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const col = Math.min(Math.max(1, Math.floor(x / this.cellWidth) + 1), this.currentGridCols);
            const row = Math.min(Math.max(1, Math.floor(y / this.cellHeight) + 1), this.gridSize);
            
            const widgetData = this.model[this.canvasId].properties[this.draggedWidget];
            
            // Проверка границ
            const maxCol = Math.min(col, this.currentGridCols - widgetData.layout.colSpan + 1);
            const maxRow = Math.min(row, this.gridSize - widgetData.layout.rowSpan + 1);
            
            // Показ ghost элемента
            this.ghostElement.style.display = 'block';
            this.ghostElement.style.gridColumn = `${maxCol} / span ${widgetData.layout.colSpan}`;
            this.ghostElement.style.gridRow = `${maxRow} / span ${widgetData.layout.rowSpan}`;
            
            // Проверка коллизий
            const hasCollision = this.checkCollision(
                maxCol, maxRow, 
                widgetData.layout.colSpan, 
                widgetData.layout.rowSpan, 
                this.draggedWidget
            );
            
            if (hasCollision) {
                this.ghostElement.classList.add('collision');
            } else {
                this.ghostElement.classList.remove('collision');
            }
        });
        
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.draggedWidget || this.screenMode !== 'desktop') return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const col = Math.min(Math.max(1, Math.floor(x / this.cellWidth) + 1), this.currentGridCols);
            const row = Math.min(Math.max(1, Math.floor(y / this.cellHeight) + 1), this.gridSize);
            
            const widgetData = this.model[this.canvasId].properties[this.draggedWidget];
            
            // Проверка границ
            const maxCol = Math.min(col, this.currentGridCols - widgetData.layout.colSpan + 1);
            const maxRow = Math.min(row, this.gridSize - widgetData.layout.rowSpan + 1);
            
            // Проверка коллизий перед перемещением
            const hasCollision = this.checkCollision(
                maxCol, maxRow, 
                widgetData.layout.colSpan, 
                widgetData.layout.rowSpan, 
                this.draggedWidget
            );
            
            if (!hasCollision) {
        // Обновление позиции в модели
        widgetData.layout.col = maxCol;
        widgetData.layout.row = maxRow;
                this.renderWidgets();
            }
        });
    }

    checkCollision(col, row, colSpan, rowSpan, excludeWidgetId = null) {
        const properties = this.model[this.canvasId].properties;
        
        // В адаптивных режимах используем виртуальную проверку
        if (this.screenMode !== 'desktop') {
            const adaptedPositions = this.reorganizeForMobile();
            
            for (let widgetId in adaptedPositions) {
                if (widgetId === excludeWidgetId) continue;
                
                const widget = adaptedPositions[widgetId];
                
                if (!(col + colSpan <= widget.col || 
                      widget.col + widget.colSpan <= col || 
                      row + rowSpan <= widget.row || 
                      widget.row + widget.rowSpan <= row)) {
                    return true;
                }
            }
            return false;
        }
        
        // Для desktop режима используем оригинальные позиции
        for (let widgetId in properties) {
            if (widgetId === excludeWidgetId) continue;
            
            const widget = properties[widgetId];
            const wCol = widget.layout.col;
            const wRow = widget.layout.row;
            const wColSpan = widget.layout.colSpan;
            const wRowSpan = widget.layout.rowSpan;
            
            if (!(col + colSpan <= wCol || 
                  wCol + wColSpan <= col || 
                  row + rowSpan <= wRow || 
                  wRow + wRowSpan <= row)) {
                return true;
            }
        }
        return false;
    }

    findFreePosition(rowSpan, colSpan) {
        // РђРґР°РїС‚РёСЂСѓРµРј СЂР°Р·РјРµСЂС‹ РїРѕРґ С‚РµРєСѓС‰РёР№ СЌРєСЂР°РЅ
        const maxColSpan = Math.min(colSpan, this.currentGridCols);
        
        // В мобильном режиме ищем позицию с учетом реорганизации
        if (this.screenMode !== 'desktop') {
            const adaptedPositions = this.reorganizeForMobile();
            let maxRow = 1;
            
            // Находим максимальную занятую строку
            for (let widgetId in adaptedPositions) {
                const widget = adaptedPositions[widgetId];
                maxRow = Math.max(maxRow, widget.row + widget.rowSpan - 1);
            }
            
            // Пробуем разместить в существующих строках…
            for (let row = 1; row <= maxRow + 1; row++) {
                for (let col = 1; col <= this.currentGridCols - maxColSpan + 1; col++) {
                    if (!this.checkCollision(col, row, maxColSpan, rowSpan)) {
                        return { row, col, colSpan: maxColSpan };
                    }
                }
            }
            
            // Если не нашли места, добавляем в новую строку
            return { row: maxRow + 1, col: 1, colSpan: maxColSpan };
        }
        
        // Для desktop режима
        for (let row = 1; row <= this.gridSize - rowSpan + 1; row++) {
            for (let col = 1; col <= this.gridSize - colSpan + 1; col++) {
                if (!this.checkCollision(col, row, colSpan, rowSpan)) {
                    return { row, col, colSpan };
                }
            }
        }
        return null;
    }

    addWidget(description, rowSpan, colSpan) {
        // РђРґР°РїС‚РёСЂСѓРµРј СЂР°Р·РјРµСЂС‹ РїРѕРґ С‚РµРєСѓС‰РёР№ СЌРєСЂР°РЅ
        const adaptedColSpan = Math.min(colSpan, this.currentGridCols);
        
        const position = this.findFreePosition(rowSpan, adaptedColSpan);
        
        if (!position) {
            alert('Нет свободного места для виджета такого размера');
            return;
        }
        
        const widgetId = this.generateUUID();
        
        // Сохраняем оригинальные размеры в модели
        this.model[this.canvasId].properties[widgetId] = {
            component: "widget",
            description: description,
            layout: {
                row: position.row,
                col: position.col,
                rowSpan: rowSpan,
                colSpan: position.colSpan || colSpan
            }
        };
        
        this.renderWidgets();
    }

    deleteWidget(widgetId) {
        delete this.model[this.canvasId].properties[widgetId];
        this.renderWidgets();
    }

    exportModel() {
        return JSON.stringify(this.model, null, 2);
    }
}

    // Инициализация
    let canvasEditor;

document.addEventListener('DOMContentLoaded', () => {
    canvasEditor = new CanvasEditor();
});

// Глобальные функции для кнопок
function addWidget() {
    const description = document.getElementById('widgetDescription').value;
    const rowSpan = parseInt(document.getElementById('widgetRows').value);
    const colSpan = parseInt(document.getElementById('widgetCols').value);
    
    if (!description) {
        alert('Введите название виджета');
        return;
    }
    
    canvasEditor.addWidget(description, rowSpan, colSpan);
    document.getElementById('widgetDescription').value = '';
}

function showJSON() {
    const jsonOutput = document.getElementById('jsonOutput');
    const jsonContent = document.getElementById('jsonContent');
    jsonContent.textContent = canvasEditor.exportModel();
    jsonOutput.style.display = 'block';
}

function hideJSON() {
    document.getElementById('jsonOutput').style.display = 'none';
}