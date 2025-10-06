export class StreakManager {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.pageNum = null;
        this.coords = null;
        this.count = 0;
    }
    
    update(pageNum, coords) {
        this.pageNum = pageNum;
        this.coords = coords;
    }
    
    matches(pageNum, coords) {
        return this.pageNum === pageNum && this.coords === coords;
    }
    
    incrementCount() {
        this.count++;
    }
    
    getCount() {
        return this.count;
    }
}
